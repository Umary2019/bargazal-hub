import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/app/protected-route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/staff")({ component: StaffPage });
function StaffPage() {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", phone: "", jobTitle: "" });
  const [loading, setLoading] = useState(false);
  const set = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) => setForm((current) => ({ ...current, [key]: event.target.value }));
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("create-staff-account", { body: form });
      if (error) throw error;
      toast.success("Staff account created. They can now sign in with these credentials.");
      setForm({ fullName: "", email: "", password: "", phone: "", jobTitle: "" });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not create staff account"); }
    finally { setLoading(false); }
  }
  return <ProtectedRoute><Card className="max-w-2xl"><CardHeader><CardTitle>Create staff login</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2"><Input placeholder="Full name" value={form.fullName} onChange={set("fullName")} required /><Input placeholder="Job title" value={form.jobTitle} onChange={set("jobTitle")} required /><Input type="email" placeholder="Email" value={form.email} onChange={set("email")} required /><Input placeholder="Phone" value={form.phone} onChange={set("phone")} required /><Input className="sm:col-span-2" type="password" minLength={8} placeholder="Temporary password" value={form.password} onChange={set("password")} required /><Button className="sm:col-span-2" disabled={loading}>{loading ? "Creating..." : "Create staff account"}</Button></form></CardContent></Card></ProtectedRoute>;
}
