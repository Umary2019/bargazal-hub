import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (session) {
      navigate({ to: "/dashboard", replace: true });
      return;
    }
    navigate({ to: "/landing", replace: true });
  }, [session, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Bargazal and Sons Tech Solution</h1>
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}
