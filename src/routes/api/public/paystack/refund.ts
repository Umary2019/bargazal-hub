import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const refundSchema = z.object({
  paymentId: z.string().uuid(),
  amount: z.number().positive(),
  reason: z.string().min(3),
  transactionReference: z.string().optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/paystack/refund")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYSTACK_SECRET_KEY"];
        const supabaseUrl = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
        const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];

        if (!supabaseUrl || !serviceKey) {
          return json({ error: "Server database configuration missing" }, 500);
        }

        const parsed = refundSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return json({ error: "Invalid refund payload", details: parsed.error.format() }, 400);
        }

        const { paymentId, amount, reason, transactionReference } = parsed.data;

        let gatewayRefundId: string | null = null;

        // If a transaction reference is present and Paystack secret key is configured,
        // attempt gateway refund with Paystack API.
        if (transactionReference && secret) {
          try {
            const amountKobo = Math.round(amount * 100);
            const paystackRes = await fetch("https://api.paystack.co/refund", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${secret}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                transaction: transactionReference,
                amount: amountKobo,
                merchant_note: reason,
              }),
            });

            const paystackData = await paystackRes.json().catch(() => null);
            if (paystackRes.ok && paystackData?.status && paystackData?.data?.id) {
              gatewayRefundId = String(paystackData.data.id);
            } else {
              console.warn(
                "[Paystack Refund] Gateway responded with:",
                paystackData?.message || "Non-200 status",
              );
              // We do not abort here if it was already settled or test reference,
              // but we record the gateway response if available.
              gatewayRefundId = paystackData?.data?.id ? String(paystackData.data.id) : null;
            }
          } catch (gatewayErr) {
            console.warn("[Paystack Refund] Gateway error:", gatewayErr);
          }
        }

        // Now perform atomic database refund processing
        const adminClient = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: refundResult, error: dbError } = await adminClient.rpc(
          "process_payment_refund",
          {
            _payment_id: paymentId,
            _amount: amount,
            _reason: reason,
            _gateway_refund_id: gatewayRefundId,
          },
        );

        if (dbError) {
          return json({ error: dbError.message || "Failed to record refund in database" }, 400);
        }

        return json({
          success: true,
          gatewayRefundId,
          result: refundResult,
        });
      },
    },
  },
});
