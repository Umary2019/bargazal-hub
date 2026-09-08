import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/app/protected-route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  useApproveServiceRequest,
  useRejectServiceRequest,
  useServiceRequests,
} from "@/data/service-requests";
import { useStaff } from "@/data/staff";

export const Route = createFileRoute("/requests")({ component: RequestsPage });
function RequestsPage() {
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading } = useServiceRequests();
  const { data: staff = [] } = useStaff();
  const approveRequest = useApproveServiceRequest();
  const rejectRequest = useRejectServiceRequest();
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const { data: pendingClients = [] } = useQuery({
    queryKey: ["pending-client-registrations"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clients")
        .select("id, full_name, email, phone, approval_status")
        .eq("approval_status", "Pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: pendingStaff = [] } = useQuery({
    queryKey: ["pending-staff-registrations"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, email, phone, job_title, approval_status")
        .eq("approval_status", "Pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "staff");
      if (rolesError) throw rolesError;
      const staffIds = new Set((roles ?? []).map((role) => role.user_id));
      return data.filter((profile: { id: string }) => staffIds.has(profile.id));
    },
  });

  async function approveClient(id: string, approved: boolean) {
    const { error } = await supabase.rpc(
      "approve_client" as never,
      { _client_id: id, _approved: approved } as never,
    );
    if (error) toast.error(error.message);
    else {
      toast.success(approved ? "Client approved" : "Client rejected");
      void queryClient.invalidateQueries({ queryKey: ["pending-client-registrations"] });
    }
  }

  async function approveStaff(id: string, approved: boolean) {
    const { error } = await (supabase as any).rpc("approve_staff", {
      _user_id: id,
      _approved: approved,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(approved ? "Staff member approved" : "Staff member rejected");
      void queryClient.invalidateQueries({ queryKey: ["pending-staff-registrations"] });
    }
  }

  return (
    <ProtectedRoute roles={["admin"]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Requests</h1>
          <p className="text-muted-foreground">
            Approve staff and client registrations before they can sign in.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Pending client registrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending clients.</p>
            ) : (
              pendingClients.map((client: any) => (
                <div
                  key={client.id}
                  className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{client.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {client.email} · {client.phone}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approveClient(client.id, true)}>
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => approveClient(client.id, false)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending staff registrations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingStaff.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending staff.</p>
            ) : (
              pendingStaff.map((staff: any) => (
                <div
                  key={staff.id}
                  className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{staff.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {staff.email} · {staff.job_title ?? "Staff"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approveStaff(staff.id, true)}>
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => approveStaff(staff.id, false)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              {isLoading
                ? "Loading..."
                : `${requests.length} service request${requests.length === 1 ? "" : "s"}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No service requests yet.</p>
            ) : (
              requests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{request.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.clients?.full_name ?? "Client"} ·{" "}
                      {request.services?.name ?? "Service"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{request.status}</Badge>
                    {request.status === "Pending" ? (
                      <>
                        <Select
                          value={assignments[request.id] || "unassigned"}
                          onValueChange={(value) =>
                            setAssignments((current) => ({
                              ...current,
                              [request.id]: value === "unassigned" ? "" : value,
                            }))
                          }
                        >
                          <SelectTrigger className="w-44" aria-label="Assign staff member">
                            <SelectValue placeholder="Assign staff" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Leave unassigned</SelectItem>
                            {staff.map((member) => (
                              <SelectItem key={member.user_id} value={member.user_id}>
                                {member.full_name || member.email}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          disabled={approveRequest.isPending}
                          onClick={() =>
                            approveRequest.mutate({
                              request,
                              assignedStaffId: assignments[request.id] || null,
                            })
                          }
                        >
                          Approve & create job
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={rejectRequest.isPending}
                          onClick={() => rejectRequest.mutate({ id: request.id })}
                        >
                          Reject
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
