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
          data?: { status?: string; amount?: number; paid_at?: string; channel?: string };
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
            .select("id")
            .eq("provider_reference", reference)
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

            const invoiceId = tx?.invoice_id || (result.data as any).metadata?.invoice_id;
            if (!invoiceId) {
              console.error("Could not resolve invoice_id for verified reference", reference);
              return json({ error: "Could not associate payment with an invoice" }, 400);
            }

            // Fetch linked invoice to get client_id and project_id
            const { data: inv } = await dbClient
              .from("invoices")
              .select("id, client_id, project_id, total, amount_paid")
              .eq("id", invoiceId)
              .single();

            const clientId =
              tx?.client_id || (result.data as any).metadata?.client_id || inv?.client_id;
            if (!clientId) {
              throw new Error("Missing client_id for payment");
            }
            const projectId = inv?.project_id || null;

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
                provider_reference: reference,
                channel,
                currency: "NGN",
                notes: `Paystack ${channel}`,
                payment_number: "",
              })
              .select("id")
              .single();

            let paymentId = newPayment?.id;

            if (payError) {
              if (payError.code === "23505") {
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
            }

            // Update invoice balance and status
            if (inv) {
              const newAmountPaid = Number(inv.amount_paid || 0) + paidAmount;
              const newStatus =
                newAmountPaid >= Number(inv.total) && Number(inv.total) > 0
                  ? "Paid"
                  : "Partially Paid";
              await dbClient
                .from("invoices")
                .update({ amount_paid: newAmountPaid, status: newStatus })
                .eq("id", invoiceId);
            }

            // Update project balance
            if (projectId) {
              const { data: projPayments } = await dbClient
                .from("payments")
                .select("amount")
                .eq("project_id", projectId);

              const projPaid = (projPayments || []).reduce(
                (acc, p) => acc + Number(p.amount),
                0,
              );
              await dbClient
                .from("projects")
                .update({ amount_paid: projPaid })
                .eq("id", projectId);
            }

            // Update transaction status if tx row exists
            if (tx?.id) {
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
