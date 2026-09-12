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
            currency?: string;
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
          const currency = (result.data.currency || "").toUpperCase();
          if (currency && currency !== "NGN") {
            console.error("Paystack verified currency mismatch:", currency);
            return json({ error: "Invalid payment currency" }, 400);
          }

          const paidAmount = (result.data.amount ?? 0) / 100;
          if (paidAmount <= 0) {
            console.error("Paystack verified amount invalid:", result.data.amount);
            return json({ error: "Invalid payment amount" }, 400);
          }

          const paidAt = result.data.paid_at ?? new Date().toISOString();
          const channel = result.data.channel ?? "online";

          // 1. Idempotency Check: check if payment is already recorded in public.payments
          const { data: existingPayment } = await dbClient
            .from("payments")
            .select("id, invoice_id, amount")
            .eq("reference", reference)
            .maybeSingle();

          if (existingPayment) {
            return json({
              status: "success",
              reference,
              amount: Number(existingPayment.amount) || paidAmount,
              channel,
              paidAt,
              invoiceId: existingPayment.invoice_id,
              paymentId: existingPayment.id,
              alreadyRecorded: true,
            });
          }

          // 2. Primary Settlement: Settle verified payment via secure database-side SECURITY DEFINER RPC
          let rpcSuccess = false;
          let rpcInvoiceId: string | undefined;
          let rpcPaymentId: string | undefined;
          let alreadyRecorded = false;

          try {
            const { data: rpcData, error: rpcError } = await dbClient.rpc(
              "record_paystack_success" as never,
              {
                _reference: reference,
                _amount: paidAmount,
                _paid_at: paidAt,
                _channel: channel,
                _raw: result as unknown as Record<string, unknown>,
              } as never,
            );

            if (!rpcError && (rpcData as any)?.ok) {
              rpcSuccess = true;
              rpcInvoiceId = (rpcData as any)?.invoice_id;
              rpcPaymentId = (rpcData as any)?.payment_id;
              alreadyRecorded = Boolean((rpcData as any)?.already_recorded);
            } else {
              console.warn(
                "record_paystack_success RPC returned error, trying settle_paystack_payment:",
                rpcError || rpcData,
              );
              const { data: settleData, error: settleError } = await dbClient.rpc(
                "settle_paystack_payment" as never,
                {
                  _reference: reference,
                  _amount: paidAmount,
                  _paid_at: paidAt,
                  _channel: channel,
                  _raw: result as unknown as Record<string, unknown>,
                } as never,
              );
              if (!settleError && (settleData as any)?.ok) {
                rpcSuccess = true;
                rpcInvoiceId = (settleData as any)?.invoice_id;
                rpcPaymentId = (settleData as any)?.payment_id;
                alreadyRecorded = Boolean((settleData as any)?.already_recorded);
              } else {
                console.warn(
                  "settle_paystack_payment RPC error, attempting metadata fallback:",
                  settleError || settleData,
                );
              }
            }
          } catch (rpcErr) {
            console.warn(
              "record_paystack_success exception, attempting metadata fallback:",
              rpcErr,
            );
          }

          if (rpcSuccess) {
            return json({
              status: "success",
              reference,
              amount: paidAmount,
              channel,
              paidAt,
              invoiceId: rpcInvoiceId,
              paymentId: rpcPaymentId,
              alreadyRecorded,
            });
          }

          // 3. Resilient Metadata Fallback: When transaction row was not initialized beforehand
          const metadata = result.data.metadata || {};
          const invoiceId = metadata.invoice_id;
          const clientId = metadata.client_id;

          if (invoiceId) {
            // Check if payment was recorded concurrently
            const { data: payRow } = await dbClient
              .from("payments")
              .select("id, invoice_id, amount")
              .eq("reference", reference)
              .maybeSingle();

            if (payRow) {
              return json({
                status: "success",
                reference,
                amount: Number(payRow.amount) || paidAmount,
                channel,
                paidAt,
                invoiceId: payRow.invoice_id,
                paymentId: payRow.id,
                alreadyRecorded: true,
              });
            }

            // Insert into payments
            const { data: newPayment, error: payError } = await dbClient
              .from("payments")
              .insert({
                invoice_id: invoiceId,
                client_id: clientId || null,
                amount: paidAmount,
                payment_method: "Online Payment",
                payment_date: paidAt.slice(0, 10),
                reference,
                notes: `Paystack ${channel}`,
                payment_number: "",
              })
              .select("id")
              .maybeSingle();

            if (!payError && newPayment) {
              // Ensure invoice status is Paid
              await dbClient.from("invoices").update({ status: "Paid" }).eq("id", invoiceId);

              // Update paystack_transactions record if accessible
              await dbClient.from("paystack_transactions").upsert(
                {
                  reference,
                  invoice_id: invoiceId,
                  client_id: clientId || null,
                  email: result.data.customer?.email || "billing@bargazal.com",
                  amount: paidAmount,
                  status: "success",
                  channel,
                  paid_at: paidAt,
                  payment_id: newPayment.id,
                  raw: result,
                },
                { onConflict: "reference" },
              );

              return json({
                status: "success",
                reference,
                amount: paidAmount,
                channel,
                paidAt,
                invoiceId,
                paymentId: newPayment.id,
                alreadyRecorded: false,
              });
            } else if (payError) {
              console.warn("Direct payment insert fallback warning:", payError.message);
            }
          }

          console.error(
            "record_paystack_success settlement and fallback both failed for reference:",
            reference,
          );
          return json(
            {
              error: "Payment settlement failed in database. Reference: " + reference,
              code: "SETTLEMENT_FAILED",
              reference,
            },
            500,
          );
        }

        try {
          await dbClient.rpc(
            "mark_paystack_failed" as never,
            {
              _reference: reference,
              _status: result.data.status === "abandoned" ? "abandoned" : "failed",
              _raw: result as unknown as Record<string, unknown>,
            } as never,
          );
        } catch {
          // ignore error if RPC fails
        }
        return json({ status: result.data.status ?? "failed" });
      },
    },
  },
});
