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

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (result.data.status === "success") {
          const { error } = await supabaseAdmin.rpc("record_paystack_success" as never, {
            _reference: reference,
            _amount: (result.data.amount ?? 0) / 100,
            _paid_at: result.data.paid_at ?? new Date().toISOString(),
            _channel: result.data.channel ?? "online",
            _raw: result as unknown as Record<string, unknown>,
          } as never);
          if (error) {
            console.error("record_paystack_success failed", error);
            return json({ status: "error" }, 500);
          }
          return json({ status: "success" });
        }

        await supabaseAdmin.rpc("mark_paystack_failed" as never, {
          _reference: reference,
          _status: result.data.status === "abandoned" ? "abandoned" : "failed",
          _raw: result as unknown as Record<string, unknown>,
        } as never);
        return json({ status: result.data.status ?? "failed" });
      },
    },
  },
});
