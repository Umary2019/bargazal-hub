import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

type PaystackEvent = {
  event?: string;
  data?: {
    reference?: string;
    amount?: number;
    paid_at?: string;
    channel?: string;
    status?: string;
  };
};

export const Route = createFileRoute("/api/public/paystack/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYSTACK_SECRET_KEY"];
        if (!secret) return new Response("Not configured", { status: 503 });

        const body = await request.text();
        const signature = request.headers.get("x-paystack-signature") ?? "";
        const expected = createHmac("sha512", secret).update(body).digest("hex");
        const sig = Buffer.from(signature);
        const exp = Buffer.from(expected);
        if (sig.length !== exp.length || !timingSafeEqual(sig, exp)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const payload = JSON.parse(body) as PaystackEvent;
        const reference = payload.data?.reference;
        if (!reference) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        if (payload.event === "charge.success" && payload.data?.status === "success") {
          const { error } = await supabaseAdmin.rpc("record_paystack_success" as never, {
            _reference: reference,
            _amount: (payload.data.amount ?? 0) / 100,
            _paid_at: payload.data.paid_at ?? new Date().toISOString(),
            _channel: payload.data.channel ?? "online",
            _raw: payload as unknown as Record<string, unknown>,
          } as never);
          if (error) {
            console.error("record_paystack_success failed", error);
            return new Response("Processing error", { status: 500 });
          }
        } else if (payload.event === "charge.failed") {
          await supabaseAdmin.rpc("mark_paystack_failed" as never, {
            _reference: reference,
            _status: "failed",
            _raw: payload as unknown as Record<string, unknown>,
          } as never);
        }

        return new Response("ok");
      },
    },
  },
});
