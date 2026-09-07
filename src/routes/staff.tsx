import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/app/protected-route";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/staff")({ component: StaffPage });
function StaffPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["staff-management"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "staff");
      if (rolesError) throw rolesError;
      const ids = (roles ?? []).map((role) => role.user_id);
      if (ids.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, email, phone, job_title, approval_status, is_active")
        .in("id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function updateStaff(userId: string, action: "approve" | "active" | "inactive") {
    const rpc = action === "approve" ? "approve_staff" : "set_staff_active";
    const { error } = await (supabase as any).rpc(rpc, {
      _user_id: userId,
      ...(action === "approve" ? { _approved: true } : { _active: action === "active" }),
    });
    if (error) toast.error(error.message);
    else {
      toast.success(action === "approve" ? "Staff member approved" : `Staff member ${action}`);
      void queryClient.invalidateQueries({ queryKey: ["staff-management"] });
    }
  }

  return (
    <ProtectedRoute>
      {isAdmin ? (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
              People management
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Staff</h1>
            <p className="mt-1 text-muted-foreground">
              Review registrations and control staff access without deleting their history.
            </p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Staff directory</CardTitle>
              <CardDescription>{staff.length} staff account(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading staff...</p>
              ) : staff.length === 0 ? (
                <p className="text-sm text-muted-foreground">No staff registrations yet.</p>
              ) : (
                <div className="divide-y">
                  {staff.map((member: any) => (
                    <div
                      key={member.id}
                      className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{member.full_name ?? "Unnamed staff"}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.email} · {member.job_title ?? "Staff"} ·{" "}
                          {member.phone ?? "No phone"}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={member.approval_status === "Approved" ? "default" : "outline"}
                        >
                          {member.is_active === false ? "Inactive" : member.approval_status}
                        </Badge>
                        {member.approval_status !== "Approved" && (
                          <Button size="sm" onClick={() => updateStaff(member.id, "approve")}>
                            Approve
                          </Button>
                        )}
                        {member.approval_status === "Approved" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateStaff(member.id, member.is_active ? "inactive" : "active")
                            }
                          >
                            {member.is_active ? "Deactivate" : "Reactivate"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>My work</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Projects assigned to you appear in the My Work area.
            </p>
          </CardContent>
        </Card>
      )}
    </ProtectedRoute>
  );
}
