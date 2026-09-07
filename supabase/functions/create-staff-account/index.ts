import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const auth = request.headers.get("Authorization");
    if (!auth) throw new Error("Authentication required");
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: userData } = await caller.auth.getUser();
    if (!userData.user) throw new Error("Authentication required");
    const { data: allowed } = await admin.rpc("is_admin", { _user_id: userData.user.id });
    if (!allowed) throw new Error("Admin access required");
    if (request.method !== "POST") throw new Error("Method not allowed");
    const body = await request.json() as { email?: string; password?: string; fullName?: string; phone?: string; jobTitle?: string };
    if (!body.email || !body.password || !body.fullName || !body.phone || !body.jobTitle) {
      throw new Error("All staff account fields are required");
    }
    const { data, error } = await admin.auth.admin.createUser({ email: body.email, password: body.password, email_confirm: true, user_metadata: { full_name: body.fullName } });
    if (error || !data.user) throw error ?? new Error("Could not create staff account");
    const profile = await admin.from("profiles").upsert({ id: data.user.id, email: body.email, full_name: body.fullName, phone: body.phone, job_title: body.jobTitle, is_active: true });
    if (profile.error) {
      await admin.auth.admin.deleteUser(data.user.id);
      throw profile.error;
    }
    const role = await admin.from("user_roles").insert({ user_id: data.user.id, role: "staff" });
    if (role.error) {
      await admin.auth.admin.deleteUser(data.user.id);
      throw role.error;
    }
    return new Response(JSON.stringify({ userId: data.user.id }), { headers: { ...headers, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Staff account creation failed" }), { status: 400, headers: { ...headers, "Content-Type": "application/json" } });
  }
});
