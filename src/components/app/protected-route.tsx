import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth, homeRouteForRole, type PortalRole } from "@/hooks/useAuth";
import { AppLayout } from "@/components/app/app-layout";

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: Exclude<PortalRole, null>[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { session, loading, roleLoading, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !session) {
      window.sessionStorage.setItem("returnTo", window.location.pathname + window.location.search);
      navigate({ to: "/login" });
      return;
    }
    if (!loading && session && !roleLoading && roles && role && !roles.includes(role)) {
      navigate({ to: homeRouteForRole(role) });
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
