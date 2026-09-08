import { useState } from "react";
import { FileText, FolderKanban, Plus, Send, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServices } from "@/data/services";
import { useClientPortalData, useCreateServiceRequest, useMyClient } from "@/data/portals";
import { formatCurrency, formatDate } from "@/lib/format";

export function ClientPortal() {
  const { data: client, isLoading: clientLoading } = useMyClient();
  const { data, isLoading } = useClientPortalData(client?.id);
  const { data: services = [] } = useServices();
  const createRequest = useCreateServiceRequest();
  const [serviceId, setServiceId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");

  async function submitRequest(event: React.FormEvent) {
    event.preventDefault();
    if (!client?.id || !serviceId || !title.trim()) return;
    try {
      await createRequest.mutateAsync({
        client_id: client.id,
        service_id: serviceId,
        title: title.trim(),
        description: description.trim(),
        budget: Number(budget) || 0,
      });
      setServiceId("");
      setTitle("");
      setDescription("");
      setBudget("");
      toast.success("Service request submitted for review");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not submit request");
    }
  }

  if (clientLoading || isLoading)
    return <div className="p-4 text-muted-foreground">Loading your workspace...</div>;
  if (!client)
    return (
      <Card>
        <CardContent className="pt-6">
          Your client profile is awaiting setup. Please contact the business administrator.
        </CardContent>
      </Card>
    );

  const requests = data?.requests ?? [];
  const projects = data?.projects ?? [];
  const invoices = data?.invoices ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Client workspace</h1>
        <p className="text-muted-foreground">
          Request services, follow delivery, and review billing.
        </p>
      </div>
      {client.approval_status !== "Approved" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6 text-amber-900">
            Your account is {String(client.approval_status).toLowerCase()} and requests will be
            reviewed by the team.
          </CardContent>
        </Card>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <PortalStat icon={<Send />} label="Requests" value={requests.length} />
        <PortalStat icon={<FolderKanban />} label="Projects" value={projects.length} />
        <PortalStat icon={<WalletCards />} label="Invoices" value={invoices.length} />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> Request a service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitRequest} className="space-y-3">
              <Select value={serviceId} onValueChange={setServiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services
                    .filter((service) => service.status === "Active")
                    .map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="What do you need?"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
              />
              <Textarea
                placeholder="Describe the work and expected outcome"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <Input
                type="number"
                min="0"
                placeholder="Budget (optional)"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
              />
              <Button type="submit" disabled={createRequest.isPending || !serviceId}>
                {createRequest.isPending ? "Submitting..." : "Submit request"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>My requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No service requests yet.</p>
            ) : (
              requests.map((request: any) => (
                <div
                  key={request.id}
                  className="flex items-start justify-between gap-3 rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{request.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.services?.name ?? "Service"} · {formatDate(request.created_at)}
                    </p>
                  </div>
                  <Badge variant="outline">{request.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Project progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Approved work will appear here.</p>
          ) : (
            projects.map((project: any) => (
              <div key={project.id} className="space-y-2">
                <div className="flex justify-between gap-3">
                  <span className="font-medium">{project.title}</span>
                  <Badge variant="outline">{project.status}</Badge>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${project.progress}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{project.progress}% complete</span>
                  <span>
                    {project.deadline ? `Due ${formatDate(project.deadline)}` : "No deadline"}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Invoices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            invoices.map((invoice: any) => (
              <div key={invoice.id} className="flex justify-between rounded-md border p-3">
                <span>{invoice.invoice_number}</span>
                <span>
                  {formatCurrency(invoice.total)} · {invoice.status}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PortalStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 pt-6">
        <span className="text-primary">{icon}</span>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
