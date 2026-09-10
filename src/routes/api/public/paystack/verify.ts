import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({ reference: z.string().min(6) });

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// Called by the invoice page after Paystack redirects back, so the invoice
// updates immediately instead of waiting for the webhook.
export const Route = createFileRoute("/api/public/paystack/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYSTACK_SECRET_KEY"];
        if (!secret) return json({ error: "Online payments are not configured" }, 503);

        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "Invalid request" }, 400);
        const reference = parsed.data.reference;

        const response = await fetch(
          `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
          { headers: { Authorization: `Bearer ${secret}` } },
        );
        const result = (await response.json().catch(() => null)) as {
          status?: boolean;
          data?: {
            status?: string;
            amount?: number;
            paid_at?: string;
            channel?: string;
            metadata?: {
              invoice_id?: string;
              invoice_number?: string;
              client_id?: string;
              balance?: number;
              public_token?: string;
            };
            customer?: { email?: string; first_name?: string; last_name?: string };
          };
        } | null;

        if (!response.ok || !result?.status || !result.data) {
          return json({ status: "unknown" }, 502);
        }

        const authHeader =
          request.headers.get("authorization") || request.headers.get("Authorization");
        const jwt = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : null;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { createClient } = await import("@supabase/supabase-js");

        const supabaseUrl = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"]!;
        const supabaseKey =
          process.env["SUPABASE_SERVICE_ROLE_KEY"] ||
          process.env["SUPABASE_PUBLISHABLE_KEY"] ||
          process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]!;

        const dbClient = process.env["SUPABASE_SERVICE_ROLE_KEY"]
          ? supabaseAdmin
          : jwt
            ? (createClient(supabaseUrl, supabaseKey, {
                auth: { persistSession: false },
                global: { headers: { Authorization: `Bearer ${jwt}` } },
              }) as any)
            : supabaseAdmin;

        if (result.data.status === "success") {
          const paidAmount = (result.data.amount ?? 0) / 100;
          const paidAt = result.data.paid_at ?? new Date().toISOString();
          const channel = result.data.channel ?? "online";

          // 1. Check if payment already exists for this reference (Idempotency)
          const { data: existingPayment } = await dbClient
            .from("payments")
            .select("id, payment_number, amount, reference")
            .eq("reference", reference)
            .maybeSingle();

          if (existingPayment?.id) {
            return json({
              status: "success",
              reference,
              amount: paidAmount,
              channel,
              paidAt,
              alreadyRecorded: true,
            });
          }

          let successRecorded = false;
          try {
            const { data: rpcData, error } = await dbClient.rpc(
              "record_paystack_success" as never,
              {
                _reference: reference,
                _amount: paidAmount,
                _paid_at: paidAt,
                _channel: channel,
                _raw: result as unknown as Record<string, unknown>,
              } as never,
            );
            if (!error && (rpcData as any)?.ok) {
              successRecorded = true;
            } else if (error) {
              console.warn("record_paystack_success RPC returned error, executing fallback:", error);
            }
          } catch (rpcErr) {
            console.warn("record_paystack_success RPC threw exception, executing fallback:", rpcErr);
          }

          if (!successRecorded) {
            // Direct database transaction fallback
            const { data: tx } = await dbClient
              .from("paystack_transactions")
              .select("*")
              .eq("reference", reference)
              .maybeSingle();

            const invoiceId = tx?.invoice_id || result.data.metadata?.invoice_id;
            if (!invoiceId) {
              console.error("Could not resolve invoice_id for verified reference", reference);
              return json({ error: "Could not associate payment with an invoice" }, 400);
            }

            // Fetch linked invoice to get client_id, project_id, and amounts
            const { data: inv } = await dbClient
              .from("invoices")
              .select("id, client_id, project_id, total, amount_paid, status, subtotal")
              .eq("id", invoiceId)
              .maybeSingle();

            const clientId =
              tx?.client_id || result.data.metadata?.client_id || inv?.client_id;
            if (!clientId) {
              return json({ error: "Missing client_id for payment" }, 400);
            }
            const projectId = inv?.project_id || null;

            // Ensure invoice total matches at least paidAmount so validate_payment_amount trigger does not throw
            if (inv && Number(inv.total ?? 0) < paidAmount) {
              try {
                await dbClient
                  .from("invoices")
                  .update({
                    subtotal: paidAmount,
                    total: paidAmount,
                  })
                  .eq("id", invoiceId);
              } catch (updateErr) {
                console.warn("Could not adjust invoice total before payment insert:", updateErr);
              }
            }

            // Direct payment insert matching exact columns on public.payments:
            // id, payment_number (auto), client_id, invoice_id, project_id, amount, payment_method, payment_date, reference, notes
            const { data: newPayment, error: payError } = await dbClient
              .from("payments")
              .insert({
                client_id: clientId,
                invoice_id: invoiceId,
                project_id: projectId,
                amount: paidAmount,
                payment_method: "Online Payment",
                payment_date: paidAt.slice(0, 10),
                reference,
                notes: `Paystack ${channel}`,
              })
              .select("id, payment_number, amount")
              .maybeSingle();

            let paymentId = newPayment?.id;

            if (payError) {
              if (payError.code === "23505" || payError.message?.includes("unique")) {
                // Duplicate reference constraint - already recorded
                return json({
                  status: "success",
                  reference,
                  amount: paidAmount,
                  channel,
                  paidAt,
                  alreadyRecorded: true,
                });
              }
              console.error("Direct payment insert error:", payError);
              return json(
                {
                  error: payError.message || "Could not record payment in database",
                  code: payError.code,
                },
                500,
              );
            }

            // Explicitly ensure invoice status is updated to Paid
            try {
              await dbClient
                .from("invoices")
                .update({ status: "Paid" })
                .eq("id", invoiceId);
            } catch (invErr) {
              console.warn("Direct invoice status touch warning:", invErr);
            }

            // Update transaction status if tx row exists
            if (tx?.id) {
              try {
                await dbClient
                  .from("paystack_transactions")
                  .update({
                    status: "success",
                    paid_at: paidAt,
                    channel,
                    raw: result as any,
                    payment_id: paymentId || null,
                  })
                  .eq("id", tx.id);
              } catch (txErr) {
                console.warn("paystack_transactions update warning:", txErr);
              }
            }
          }

          return json({
            status: "success",
            reference,
            amount: paidAmount,
            channel,
            paidAt,
          });
        }

        try {
          await dbClient.rpc("mark_paystack_failed" as never, {
            _reference: reference,
            _status: result.data.status === "abandoned" ? "abandoned" : "failed",
            _raw: result as unknown as Record<string, unknown>,
          } as never);
        } catch {
          // ignore error if RPC fails
        }
        return json({ status: result.data.status ?? "failed" });
      },
    },
  },
});
