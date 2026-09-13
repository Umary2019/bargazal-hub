import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const navigateAfterLogin = useCallback(() => {
    const returnTo = window.sessionStorage.getItem("returnTo");
    window.sessionStorage.removeItem("returnTo");
    if (returnTo?.startsWith("/")) {
      window.location.assign(returnTo);
      return;
    }
    navigate({ to: "/dashboard" });
  }, [navigate]);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!loading && session) {
      navigateAfterLogin();
    }
  }, [session, loading, navigateAfterLogin]);

  async function onSubmit(data: LoginForm) {
    setIsLoading(true);
    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        toast.error(error.message || "Login failed. Please check your credentials.");
        return;
      }

      const [{ data: profile, error: profileError }, { data: clientRow }] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("approval_status, is_active")
          .eq("id", authData.user.id)
          .maybeSingle(),
        (supabase as any)
          .from("clients")
          .select("id, approval_status")
          .eq("auth_user_id", authData.user.id)
          .maybeSingle(),
      ]);
      if (profileError) throw profileError;

      const clientApproval = clientRow?.approval_status
        ? String(clientRow.approval_status).toLowerCase()
        : null;
      const profileApproval = profile?.approval_status
        ? String(profile.approval_status).toLowerCase()
        : null;
      const effectiveApproval = clientApproval ?? profileApproval ?? "";
      const isActive = profile?.is_active !== false;

      if (effectiveApproval !== "approved" || !isActive) {
        await supabase.auth.signOut();
        toast.error(
          effectiveApproval === "rejected"
            ? "Your registration was rejected. Contact the administrator."
            : "Your registration is awaiting administrator approval.",
        );
        return;
      }

      // If client was approved in clients table but profile was not yet synced, synchronize now
      if (clientApproval === "approved" && profileApproval !== "approved") {
        await (supabase as any)
          .from("profiles")
          .update({ approval_status: "Approved", is_active: true })
          .eq("id", authData.user.id);
      }

      toast.success("Login successful!");
      navigateAfterLogin();
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!forgotEmail) {
      toast.error("Please enter your email address");
      return;
    }

    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail);

      if (error) {
        toast.error(error.message || "Failed to send reset email");
        return;
      }

      toast.success("Password reset email sent! Check your inbox.");
      setShowForgotPassword(false);
      setForgotEmail("");
    } catch (err) {
      toast.error("An unexpected error occurred. Please try again.");
      console.error(err);
    } finally {
      setForgotLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_transparent_25%),linear-gradient(135deg,#0f172a_0%,#111827_35%,#0b1220_100%)] px-4 py-10">
      <Card className="w-full max-w-md border-slate-200/20 bg-white/95 shadow-2xl shadow-slate-950/20 backdrop-blur-sm">
        <CardHeader className="space-y-2 pb-4">
          <div className="mb-2 flex items-center gap-3">
            <img
              src="/company-logo.png"
              alt="Bargazal and Sons Tech Solution logo"
              className="h-11 w-11 rounded-2xl object-cover shadow-lg shadow-slate-900/20"
            />
            <div>
              <CardTitle className="text-2xl text-slate-900">Bargazal and Sons</CardTitle>
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                Secure sign in
              </div>
            </div>
          </div>
          <CardDescription className="text-sm text-slate-600">
            Business software for Bargazal and Sons Tech Solution
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showForgotPassword ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="admin@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input placeholder="••••••••" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-slate-900 text-white hover:bg-slate-800"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>

                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="w-full text-center text-sm font-medium text-blue-600 transition hover:text-blue-700"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/register" })}
                  className="w-full text-center text-sm font-medium text-slate-600 transition hover:text-slate-900"
                >
                  Register as a client or staff member
                </button>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <Input
                placeholder="your@email.com"
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotEmail("");
                  }}
                >
                  Back
                </Button>
                <Button
                  className="flex-1 bg-slate-900 text-white hover:bg-slate-800"
                  onClick={handleForgotPassword}
                  disabled={forgotLoading}
                >
                  {forgotLoading ? "Sending..." : "Send Reset Link"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
