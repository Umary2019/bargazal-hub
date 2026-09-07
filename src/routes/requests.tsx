import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/app/protected-route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/requests")({ component: RequestsPage });
function RequestsPage() {
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading } = useQuery({ queryKey: ["service-requests"], queryFn: async () => { const { data, error } = await (supabase as any).from("service_requests").select("*, clients(full_name, email), services(name)").order("created_at", { ascending: false }); if (error) throw error; return data ?? []; } });
  async function approve(id: string, approved: boolean) { const { error } = await supabase.rpc("approve_client", { _client_id: id, _approved: approved }); if (error) toast.error(error.message); else { toast.success(approved ? "Client approved" : "Client rejected"); void queryClient.invalidateQueries({ queryKey: ["service-requests"] }); } }
  return <ProtectedRoute><div className="space-y-6"><div><h1 className="text-3xl font-bold tracking-tight">Requests</h1><p className="text-muted-foreground">Review client access and service requests.</p></div><Card><CardHeader><CardTitle>{isLoading ? "Loading..." : `${requests.length} service request${requests.length === 1 ? "" : "s"}`}</CardTitle></CardHeader><CardContent className="space-y-3">{requests.length === 0 ? <p className="text-sm text-muted-foreground">No service requests yet.</p> : requests.map((request: any) => <div key={request.id} className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{request.title}</p><p className="text-sm text-muted-foreground">{request.clients?.full_name ?? "Client"} · {request.services?.name ?? "Service"}</p></div><div className="flex items-center gap-2"><Badge variant="outline">{request.status}</Badge>{request.status === "Pending" && <Button size="sm" onClick={() => approve(request.client_id, true)}>Approve client</Button>}</div></div>)}</CardContent></Card></div></ProtectedRoute>;
}
