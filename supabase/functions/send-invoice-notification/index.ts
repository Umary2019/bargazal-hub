import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type RequestBody = { invoiceId: string; channels?: Array<"email" | "whatsapp"> };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) throw new Error("Authentication required");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) throw new Error("Authentication required");
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: isStaff, error: roleError } = await admin.rpc("is_staff_or_admin", { _user_id: userData.user.id });
    if (roleError || !isStaff) throw new Error("Staff access required");

    const body = await request.json() as RequestBody;
    const channels = body.channels?.length ? body.channels : ["email"];
    const { data: invoice, error: invoiceError } = await admin.from("invoices").select("*, clients(full_name, email, whatsapp), invoice_items(*)").eq("id", body.invoiceId).single();
    if (invoiceError || !invoice) throw new Error("Invoice not found");
    const { data: settings } = await admin.from("business_settings").select("*").limit(1).maybeSingle();
    let { data: token } = await admin.from("invoice_public_tokens").select("token").eq("invoice_id", body.invoiceId).is("revoked_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!token) {
      const created = await admin.from("invoice_public_tokens").insert({ invoice_id: body.invoiceId, created_by: userData.user.id }).select("token").single();
      if (created.error) throw created.error;
      token = created.data;
    }
    const publicUrl = `${Deno.env.get("PUBLIC_APP_URL") ?? "https://bargazalandsonstechs.vercel.app"}/public/invoices/${token.token}`;
    const balance = Number(invoice.balance ?? 0);
    const subject = `Invoice ${invoice.invoice_number} from ${settings?.business_name ?? "Bargazal and Sons Tech Solution"}`;
    const html = `<h2>${subject}</h2><p>Hello ${invoice.clients?.full_name ?? "Client"},</p><p>Your invoice total is <strong>NGN ${Number(invoice.total).toLocaleString()}</strong>. Balance due: <strong>NGN ${balance.toLocaleString()}</strong>.</p><p><a href="${publicUrl}">View invoice</a></p>`;
    const results: Array<{ channel: string; status: string }> = [];

    if (channels.includes("email") && invoice.clients?.email) {
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: Deno.env.get("MAIL_FROM") ?? "onboarding@resend.dev", to: [invoice.clients.email], reply_to: Deno.env.get("MAIL_REPLY_TO") ?? settings?.email, subject, html }) });
      const payload = await response.json();
      const status = response.ok ? "sent" : "failed";
      await admin.from("notification_deliveries").insert({ invoice_id: body.invoiceId, channel: "email", recipient: invoice.clients.email, status, provider_message_id: payload.id ?? null, error_message: response.ok ? null : JSON.stringify(payload), created_by: userData.user.id });
      results.push({ channel: "email", status });
    }

    if (channels.includes("whatsapp") && invoice.clients?.whatsapp && Deno.env.get("WHATSAPP_ACCESS_TOKEN") && Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")) {
      const phone = invoice.clients.whatsapp.replace(/\D/g, "").replace(/^0/, "234");
      const response = await fetch(`https://graph.facebook.com/v23.0/${Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")}/messages`, { method: "POST", headers: { Authorization: `Bearer ${Deno.env.get("WHATSAPP_ACCESS_TOKEN")}`, "Content-Type": "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body: `${subject}\nTotal: NGN ${Number(invoice.total).toLocaleString()}\nBalance: NGN ${balance.toLocaleString()}\n${publicUrl}` } }) });
      const payload = await response.json();
      const status = response.ok ? "sent" : "failed";
      await admin.from("notification_deliveries").insert({ invoice_id: body.invoiceId, channel: "whatsapp", recipient: phone, status, provider_message_id: payload.messages?.[0]?.id ?? null, error_message: response.ok ? null : JSON.stringify(payload), created_by: userData.user.id });
      results.push({ channel: "whatsapp", status });
    }
    return new Response(JSON.stringify({ publicUrl, results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Notification failed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});