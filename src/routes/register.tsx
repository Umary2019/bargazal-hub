import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/register")({ component: RegisterPage });

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    city: "",
    state: "",
  });
  const [loading, setLoading] = useState(false);
  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
            account_type: "client",
            phone: form.phone,
            address: form.address,
            city: form.city,
            state: form.state,
          },
        },
      });
      if (error) throw error;
      if (!data.session) {
        toast.success(
          "Registration submitted. Confirm your email, then wait for administrator approval.",
        );
        navigate({ to: "/login" });
        return;
      }
      const { error: profileError } = await (supabase as any).rpc("finalize_client_registration", {
        _full_name: form.fullName,
        _phone: form.phone,
        _address: form.address,
        _city: form.city,
        _state: form.state,
      });
      if (profileError) throw profileError;
      await supabase.auth.signOut();
      toast.success("Registration submitted for administrator approval.");
      navigate({ to: "/login" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_transparent_25%),linear-gradient(135deg,#0f172a_0%,#111827_35%,#0b1220_100%)] px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Register</CardTitle>
          <CardDescription>
            Your account must be approved by an administrator before you can sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <Input
              className="sm:col-span-2"
              placeholder="Full name"
              value={form.fullName}
              onChange={update("fullName")}
              required
            />
            <Input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={update("email")}
              required
            />
            <Input
              type="password"
              minLength={6}
              placeholder="Password"
              value={form.password}
              onChange={update("password")}
              required
            />
            <Input placeholder="Phone" value={form.phone} onChange={update("phone")} required />
            <Input
              placeholder="Address"
              value={form.address}
              onChange={update("address")}
              required
            />
            <Input placeholder="City" value={form.city} onChange={update("city")} required />
            <Input placeholder="State" value={form.state} onChange={update("state")} required />
            <Button className="sm:col-span-2" type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit registration"}
            </Button>
            <Button
              className="sm:col-span-2"
              variant="ghost"
              type="button"
              onClick={() => navigate({ to: "/login" })}
            >
              Back to sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
