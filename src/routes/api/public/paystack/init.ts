import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  token: z.string().min(10),
  email: z.string().email().optional(),
});

type PublicInvoice = {
  invoice: { id: string; invoice_number: string; balance: number; client_id: string };
  client: { id: string; full_name: string; email: string | null };
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/paystack/init")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYSTACK_SECRET_KEY"];
        if (!secret) return json({ error: "Online payments are not configured" }, 503);

        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "Invalid request" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // The public invoice token is the only credential here; it authorises this invoice only.
        const { data, error } = await supabaseAdmin.rpc("get_public_invoice" as never, {
          _token: parsed.data.token,
        } as never);
        if (error || !data) return json({ error: "Invoice link is invalid or expired" }, 404);

        const payload = data as unknown as PublicInvoice;
        const balance = Number(payload.invoice.balance ?? 0);
        if (!(balance > 0)) return json({ error: "This invoice is already settled" }, 400);

        const email = parsed.data.email ?? payload.client.email;
        if (!email) return json({ error: "An email address is required to pay online" }, 400);

        const reference = `BTS-${payload.invoice.invoice_number}-${Date.now()}`;
        const appUrl = (process.env["PUBLIC_APP_URL"] ?? new URL(request.url).origin).replace(
          /\/$/,
          "",
        );
        const callbackUrl = `${appUrl}/public/invoices/${parsed.data.token}?reference=${encodeURIComponent(reference)}`;

        const response = await fetch("https://api.paystack.co/transaction/initialize", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            amount: Math.round(balance * 100),
            currency: "NGN",
            reference,
            callback_url: callbackUrl,
            metadata: {
              invoice_id: payload.invoice.id,
              invoice_number: payload.invoice.invoice_number,
              client_name: payload.client.full_name,
            },
          }),
        });
        const result = (await response.json().catch(() => null)) as {
          status?: boolean;
          data?: { authorization_url?: string };
        } | null;

        if (!response.ok || !result?.status || !result.data?.authorization_url) {
          console.error("Paystack initialize failed", response.status, result);
          return json({ error: "Could not start the payment. Please try again." }, 502);
        }

        const insert = await supabaseAdmin.from("paystack_transactions").insert({
          reference,
          invoice_id: payload.invoice.id,
          client_id: payload.client.id,
          email,
          amount: balance,
          authorization_url: result.data.authorization_url,
        });
        if (insert.error) {
          console.error("Paystack transaction insert failed", insert.error);
          return json({ error: "Could not start the payment. Please try again." }, 500);
        }

        return json({ authorizationUrl: result.data.authorization_url, reference });
      },
    },
  },
});
