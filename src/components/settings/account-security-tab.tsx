import { useState } from "react";
import {
  ShieldCheck,
  KeyRound,
  Lock,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Clock,
  UserCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";

export function AccountSecurityTab() {
  const { user, role } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      // Log security event
      if (user?.id) {
        await supabase.from("activity_log").insert({
          action: "password_changed",
          actor_id: user.id,
          entity_type: "auth",
          entity_id: user.id,
          detail: "User updated their account password",
        });
      }

      toast.success("Password updated successfully");
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleGlobalSignOut = async () => {
    try {
      await supabase.auth.signOut({ scope: "others" });
      toast.success("Signed out of all other active browser sessions");
    } catch (err: any) {
      toast.error(err.message || "Failed to sign out other sessions");
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            Security Profile & Active Session
          </CardTitle>
          <CardDescription>
            Overview of your current administrative authentication status and credentials.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/40 border">
            <div>
              <p className="text-xs text-muted-foreground">Account Email</p>
              <p className="text-sm font-semibold mt-0.5">{user?.email || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Security Role</p>
              <p className="text-sm font-semibold capitalize mt-0.5 text-blue-600">
                {role || "Administrator"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Authenticated</p>
              <p className="text-sm font-medium mt-0.5 flex items-center gap-1 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                {user?.last_sign_in_at ? formatDateTime(user.last_sign_in_at) : "Current session"}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20">
            <div className="flex items-start gap-3">
              <LogOut className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-300">
                  Revoke Other Active Sessions
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Log out of any other computers, phones, or browser sessions where you are currently signed in.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleGlobalSignOut} className="shrink-0 border-amber-300 dark:border-amber-800">
              Sign Out Others
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Password Update Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-blue-600" />
            Update Account Password
          </CardTitle>
          <CardDescription>
            Change your password to maintain rigorous account security across all administrative tools.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passwordSuccess && (
            <Alert className="mb-4 bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <AlertTitle>Password Successfully Changed</AlertTitle>
              <AlertDescription>
                Your new password is now active. Please use it for your subsequent sign-ins.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4 max-w-lg">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Password must be at least 8 characters long.
            </div>

            <Button type="submit" disabled={isUpdatingPassword} className="gap-2">
              {isUpdatingPassword ? "Updating Password..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
