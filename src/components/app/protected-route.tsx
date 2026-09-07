import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, homeRouteForRole, type PortalRole } from "@/hooks/useAuth";
import { AppLayout } from "@/components/app/app-layout";
import { Button } from "@/components/ui/button";

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: Exclude<PortalRole, null>[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { session, loading, roleLoading, role, isAdmin, approvalStatus, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      window.sessionStorage.setItem("returnTo", window.location.pathname + window.location.search);
      navigate({ to: "/login" });
      return;
    }
    if (!loading && session && !roleLoading && roles && role && !roles.includes(role)) {
      navigate({ to: homeRouteForRole(role) as any });
    }
  }, [session, loading, roleLoading, role, roles, navigate]);

  if (loading || (session && roleLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (!roleLoading && !isAdmin && approvalStatus !== "Approved") {
    const rejected = approvalStatus === "Rejected";
    return (
      <AppLayout>
        <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center">
          <div className="w-full rounded-xl border bg-card p-8 text-center shadow-sm">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Account review
            </p>
            <h1 className="mt-3 text-2xl font-semibold">
              {rejected ? "Registration not approved" : "Waiting for administrator approval"}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {rejected
                ? "Your registration was not approved. Contact the administrator for assistance."
                : "Your account is registered, but access will be enabled after an administrator reviews it."}
            </p>
            <Button className="mt-6" variant="outline" onClick={() => void signOut()}>
              Sign out
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (roles && (!role || !roles.includes(role))) {
    return (
      <AppLayout>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <h2 className="text-lg font-semibold">No access</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            This area is not available for your account.
          </p>
        </div>
      </AppLayout>
    );
  }

  return <AppLayout>{children}</AppLayout>;
}
