import { createFileRoute } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/app/protected-route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/staff")({ component: StaffPage });
function StaffPage() {
  const { isAdmin } = useAuth();
  return (
    <ProtectedRoute>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{isAdmin ? "Staff registrations" : "My work"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Staff members register themselves. Review and approve pending registrations from the Requests page."
              : "Projects assigned to you appear in the My Work area."}
          </p>
          {isAdmin && (
            <Button className="mt-4" asChild>
              <a href="/requests">Review registrations</a>
            </Button>
          )}
        </CardContent>
      </Card>
    </ProtectedRoute>
  );
}
