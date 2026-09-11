import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type RequestBody = {
  action?: "initialize" | "verify";
  token?: string;
  reference?: string;
  amount?: number;
  callbackUrl?: string;
};

type PaystackResponse = {
  status: boolean;
  message: string;
  data?: {
    authorization_url?: string;
    access_code?: string;
    reference?: string;
    status?: string;
    amount?: number;
    currency?: string;
    metadata?: { invoice_id?: string; public_token?: string };
    customer?: { email?: string };
  };
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

async function paystackRequest(path: string, init: RequestInit) {
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
      "Content-Type": "application/json",
    },
  });
  const payload = (await response.json()) as PaystackResponse;
  if (!response.ok || !payload.status) throw new Error(payload.message || "Paystack request failed");
  return payload;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });

  try {
    if (request.method !== "POST") throw new Error("Method not allowed");
    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secretKey) throw new Error("Paystack is not configured");

    const body = (await request.json()) as RequestBody;
    if (!body.token) throw new Error("Invoice token is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: invoiceData, error: invoiceError } = await supabase.rpc("get_public_invoice", {
      _token: body.token,
    });
    if (invoiceError || !invoiceData) throw new Error("Invoice link is invalid or expired");

    const invoice = (invoiceData as { invoice: { id: string; invoice_number: string; client_id: string; balance: number; project_id: string | null }; client: { email: string | null } }).invoice;
    const client = (invoiceData as { client: { email: string | null } }).client;
    const balance = Number(invoice.balance);
    if (!Number.isFinite(balance) || balance <= 0) throw new Error("This invoice has no outstanding balance");
    if (!client.email) throw new Error("The invoice client must have an email address to pay online");

    if (body.action === "initialize") {
      const amount = Number(body.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > balance) {
        throw new Error("Payment amount must be greater than zero and no more than the invoice balance");
      }
      const callbackUrl = body.callbackUrl || `${Deno.env.get("PUBLIC_APP_URL") ?? ""}/public/invoices/${body.token}`;
      const result = await paystackRequest("/transaction/initialize", {
        method: "POST",
        body: JSON.stringify({
          email: client.email,
          amount: Math.round(amount * 100),
          currency: "NGN",
          callback_url: callbackUrl,
          metadata: {
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            public_token: body.token,
          },
        }),
      });
      return json({ authorizationUrl: result.data?.authorization_url, reference: result.data?.reference });
    }

    if (body.action !== "verify" || !body.reference) throw new Error("Payment reference is required");
    const existing = await supabase
      .from("payments")
      .select("id, amount, payment_number")
      .eq("reference", body.reference)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return json({ paid: true, payment: existing.data });

    const result = await paystackRequest(`/transaction/verify/${encodeURIComponent(body.reference)}`, {
      method: "GET",
    });
    const transaction = result.data;
    if (transaction?.status !== "success" || transaction.currency !== "NGN") {
      throw new Error("Paystack did not confirm this payment");
    }
    const paidAmount = Number(transaction.amount) / 100;
    if (paidAmount <= 0 || paidAmount > balance) throw new Error("The verified amount is not valid for this invoice");
    if (transaction.metadata?.invoice_id !== invoice.id || transaction.metadata?.public_token !== body.token) {
      throw new Error("Payment does not belong to this invoice");
    }

    const inserted = await supabase
      .from("payments")
      .insert({
        client_id: invoice.client_id,
        invoice_id: invoice.id,
        project_id: invoice.project_id,
        amount: paidAmount,
        payment_method: "Online Payment",
        payment_date: new Date().toISOString().slice(0, 10),
        reference: body.reference,
        notes: "Paystack online",
        payment_number: "",
      })
      .select("id, amount, payment_number")
      .single();
    if (inserted.error) {
      if (inserted.error.code === "23505") {
        const retry = await supabase.from("payments").select("id, amount, payment_number").eq("reference", body.reference).single();
        if (!retry.error) return json({ paid: true, payment: retry.data });
      }
      throw inserted.error;
    }
    return json({ paid: true, payment: inserted.data });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Payment failed" }, 400);
  }
});