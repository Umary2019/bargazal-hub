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

          // Settle verified payment via secure database-side SECURITY DEFINER RPC
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

          if (rpcError || !(rpcData as any)?.ok) {
            console.error("record_paystack_success settlement failed:", rpcError || rpcData);
            return json(
              {
                error: (rpcData as any)?.error || rpcError?.message || "Payment settlement failed",
                code: (rpcData as any)?.error || rpcError?.code || "SETTLEMENT_FAILED",
              },
              500,
            );
          }

          return json({
            status: "success",
            reference,
            amount: paidAmount,
            channel,
            paidAt,
            invoiceId: (rpcData as any)?.invoice_id,
            paymentId: (rpcData as any)?.payment_id,
            alreadyRecorded: Boolean((rpcData as any)?.already_recorded),
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
