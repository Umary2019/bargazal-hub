import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z
  .object({
    token: z.string().min(6).optional(),
    invoiceId: z.string().uuid().optional(),
    email: z.string().email().optional(),
    callbackUrl: z.string().url().optional(),
  })
  .refine((data) => Boolean(data.token || data.invoiceId), {
    message: "Either token or invoiceId must be provided",
  });

type InvoiceTarget = {
  id: string;
  invoice_number: string;
  balance: number;
  client_id: string;
  client_name: string;
  client_email: string;
  token?: string | null;
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
        const { createClient } = await import("@supabase/supabase-js");

        const supabaseUrl = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"]!;
        const supabaseKey =
          process.env["SUPABASE_SERVICE_ROLE_KEY"] ||
          process.env["SUPABASE_PUBLISHABLE_KEY"] ||
          process.env["VITE_SUPABASE_PUBLISHABLE_KEY"]!;

        let target: InvoiceTarget | null = null;
        let dbClient = supabaseAdmin;

        // Path A: Authenticated Client paying by invoiceId
        if (parsed.data.invoiceId) {
          const authHeader =
            request.headers.get("authorization") || request.headers.get("Authorization");
          if (!authHeader) {
            return json({ error: "Authentication required to pay invoice directly" }, 401);
          }

          const jwt = authHeader.replace(/^Bearer\s+/i, "");
          const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(jwt);
          if (authError || !authData?.user) {
            return json({ error: "Invalid or expired session" }, 401);
          }

          const authUserId = authData.user.id;

          // If service role key is not configured, create a client with user JWT so RLS allows reading their invoice
          if (!process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
            dbClient = createClient(supabaseUrl, supabaseKey, {
              auth: { persistSession: false },
              global: { headers: { Authorization: `Bearer ${jwt}` } },
            }) as any;
          }

          // Check if admin
          const { data: isAdminRole } = await dbClient
            .from("user_roles")
            .select("role")
            .eq("user_id", authUserId)
            .eq("role", "admin")
            .maybeSingle();

          // Fetch invoice with client details from database
          const { data: inv, error: invError } = await dbClient
            .from("invoices")
            .select(
              "id, invoice_number, total, amount_paid, balance, status, client_id, clients(id, full_name, email, auth_user_id)",
            )
            .eq("id", parsed.data.invoiceId)
            .maybeSingle();

          if (invError || !inv) {
            console.error("Invoice fetch failed:", invError);
            return json({ error: "Invoice not found" }, 404);
          }

          // Verify ownership: must be admin OR the client who owns this invoice
          const isOwner = (inv.clients as any)?.auth_user_id === authUserId;
          if (!isAdminRole && !isOwner) {
            return json({ error: "Access denied. You can only pay your own invoices." }, 403);
          }

          const balance = Number(inv.balance ?? Number(inv.total) - Number(inv.amount_paid));
          if (!(balance > 0) || inv.status === "Paid") {
            return json({ error: "This invoice is already settled" }, 400);
          }

          const clientEmail =
            (inv.clients as any)?.email || parsed.data.email || authData.user.email;
          if (!clientEmail) {
            return json({ error: "An email address is required to pay online" }, 400);
          }

          target = {
            id: inv.id,
            invoice_number: inv.invoice_number,
            balance,
            client_id: inv.client_id,
            client_name: (inv.clients as any)?.full_name || "Client",
            client_email: clientEmail,
          };
        }
        // Path B: Public token payment
        else if (parsed.data.token) {
          const { data, error } = await supabaseAdmin.rpc(
            "get_public_invoice" as never,
            {
              _token: parsed.data.token,
            } as never,
          );
          if (error || !data) return json({ error: "Invoice link is invalid or expired" }, 404);

          const payload = data as any;
          const balance = Number(payload.invoice.balance ?? 0);
          if (!(balance > 0)) return json({ error: "This invoice is already settled" }, 400);

          const email = parsed.data.email ?? payload.client.email;
          if (!email) return json({ error: "An email address is required to pay online" }, 400);

          target = {
            id: payload.invoice.id,
            invoice_number: payload.invoice.invoice_number,
            balance,
            client_id: payload.client.id,
            client_name: payload.client.full_name,
            client_email: email,
            token: parsed.data.token,
          };
        }

        if (!target) {
          return json({ error: "Could not resolve invoice target" }, 400);
        }

        const reference = `BTS-${target.invoice_number}-${Date.now()}`;
        const appUrl = (process.env["PUBLIC_APP_URL"] ?? new URL(request.url).origin).replace(
          /\/$/,
          "",
        );

        const defaultCallback = target.token
          ? `${appUrl}/public/invoices/${target.token}?reference=${encodeURIComponent(reference)}`
          : `${appUrl}/dashboard?payment=complete&reference=${encodeURIComponent(reference)}`;

        const callbackUrl = parsed.data.callbackUrl || defaultCallback;

        const response = await fetch("https://api.paystack.co/transaction/initialize", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: target.client_email,
            amount: Math.round(target.balance * 100),
            currency: "NGN",
            reference,
            callback_url: callbackUrl,
            metadata: {
              invoice_id: target.id,
              invoice_number: target.invoice_number,
              client_name: target.client_name,
              client_id: target.client_id,
              balance: target.balance,
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

        // Securely record pending transaction in paystack_transactions using SECURITY DEFINER RPC
        try {
          const { data: initData, error: initError } = await dbClient.rpc(
            "init_paystack_transaction" as never,
            {
              _reference: reference,
              _invoice_id: target.id,
              _amount: target.balance,
              _email: target.client_email,
              _authorization_url: result.data.authorization_url,
            } as never,
          );

          if (initError || !(initData as any)?.ok) {
            console.warn(
              "init_paystack_transaction RPC unavailable or failed, falling back to direct upsert:",
              initError?.message || (initData as any)?.error,
            );
            const { error: upsertError } = await dbClient.from("paystack_transactions").upsert(
              {
                reference,
                invoice_id: target.id,
                client_id: target.client_id,
                email: target.client_email,
                amount: target.balance,
                status: "pending",
                authorization_url: result.data.authorization_url,
              },
              { onConflict: "reference" },
            );
            if (upsertError) {
              console.warn("Paystack transaction upsert warning:", upsertError.message);
            }
          }
        } catch (dbErr) {
          console.warn("Database initialization warning (checkout still allowed):", dbErr);
        }

        return json({ authorizationUrl: result.data.authorization_url, reference });
      },
    },
  },
});
