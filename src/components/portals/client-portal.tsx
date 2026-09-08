import { useState } from "react";
import {
  FileText,
  FolderKanban,
  Plus,
  Send,
  WalletCards,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Calendar,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServices } from "@/data/services";
import { useClientPortalData, useMyClient } from "@/data/portals";
import { useCreateServiceRequest } from "@/data/service-requests";
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
  const [preferredDeadline, setPreferredDeadline] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  async function submitRequest(event: React.FormEvent) {
    event.preventDefault();
    if (!client?.id || !serviceId || !title.trim()) return;
    try {
      await createRequest.mutateAsync({
        client_id: client.id,
        service_id: serviceId,
        title: title.trim(),
        details: description.trim() || null,
        budget: Number(budget) || 0,
        preferred_deadline: preferredDeadline || null,
      });
      setServiceId("");
      setTitle("");
      setDescription("");
      setBudget("");
      setPreferredDeadline("");
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

  const pendingRequests = requests.filter((r: any) => r.status === "Pending");
  const approvedRequests = requests.filter((r: any) => r.status === "Approved");
  const rejectedRequests = requests.filter((r: any) => r.status === "Rejected");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Client workspace</h1>
        <p className="text-muted-foreground">
          Request services, track your project progress, and review billing.
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

      {/* Rejection Notification Banner */}
      {rejectedRequests.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="text-sm">
            <p className="font-semibold">Review Update: Request Declined</p>
            <p className="text-red-700 dark:text-red-300">
              One or more of your submitted requests could not be approved. Click &quot;View details&quot; in My Requests to review the administrator&apos;s feedback.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <PortalStat icon={<Send />} label="Requests" value={requests.length} />
        <PortalStat icon={<FolderKanban />} label="Projects" value={projects.length} />
        <PortalStat icon={<WalletCards />} label="Invoices" value={invoices.length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)]">
        {/* Request Service Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" /> Request a service
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitRequest} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Select Service *</label>
                <Select value={serviceId} onValueChange={setServiceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a service" />
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
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Project Title *</label>
                <Input
                  placeholder="e.g., E-Commerce Mobile App Development"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Details & Requirements</label>
                <Textarea
                  placeholder="Describe the scope, objectives, requirements, and deliverables..."
                  value={description}
                  rows={4}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Budget (Optional, NGN)</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g., 250000"
                    value={budget}
                    onChange={(event) => setBudget(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Preferred Deadline</label>
                  <Input
                    type="date"
                    value={preferredDeadline}
                    onChange={(event) => setPreferredDeadline(event.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full gap-2" disabled={createRequest.isPending || !serviceId}>
                <Send className="h-4 w-4" />
                {createRequest.isPending ? "Submitting Request..." : "Submit Service Request"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* My Requests List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>My Requests</CardTitle>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {pendingRequests.length} Pending
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {approvedRequests.length} Approved
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {requests.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Send className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <p>No service requests yet.</p>
                <p className="text-xs">Submit your first request using the form on the left.</p>
              </div>
            ) : (
              requests.map((request: any) => (
                <div
                  key={request.id}
                  className={`flex flex-col gap-3 rounded-lg border p-4 transition hover:shadow-xs ${
                    request.status === "Rejected"
                      ? "border-red-200 bg-red-50/30 dark:border-red-900/60 dark:bg-red-950/10"
                      : request.status === "Approved"
                        ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/60 dark:bg-emerald-950/10"
                        : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{request.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.services?.name ?? "Custom Service"} · Submitted {formatDate(request.created_at)}
                      </p>
                    </div>
                    {request.status === "Pending" && (
                      <Badge variant="outline" className="gap-1 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300">
                        <Clock className="h-3 w-3" /> Pending
                      </Badge>
                    )}
                    {request.status === "Approved" && (
                      <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700">
                        <CheckCircle2 className="h-3 w-3" /> Approved
                      </Badge>
                    )}
                    {request.status === "Rejected" && (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" /> Rejected
                      </Badge>
                    )}
                  </div>

                  {/* Rejection reason snippet */}
                  {request.status === "Rejected" && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
                      <span className="font-semibold">Reason: </span>
                      {request.rejection_reason || request.admin_note || "Requirements could not be accommodated at this time."}
                    </div>
                  )}

                  {/* Approved project note */}
                  {request.status === "Approved" && (
                    <div className="text-xs text-emerald-800 dark:text-emerald-300">
                      ✓ Approved and linked to active project delivery queue.
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-muted-foreground">
                      {request.budget ? `Budget: ${formatCurrency(request.budget)}` : "Budget: Flexible"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs font-medium text-primary hover:text-primary"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View Details
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Request Details Dialog */}
      <Dialog open={Boolean(selectedRequest)} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center justify-between gap-3 pr-6">
              <DialogTitle className="text-xl">{selectedRequest?.title}</DialogTitle>
              {selectedRequest?.status === "Pending" && (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
                  <Clock className="mr-1 h-3 w-3" /> Pending Review
                </Badge>
              )}
              {selectedRequest?.status === "Approved" && (
                <Badge className="bg-emerald-600 text-white">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Approved
                </Badge>
              )}
              {selectedRequest?.status === "Rejected" && (
                <Badge variant="destructive">
                  <XCircle className="mr-1 h-3 w-3" /> Rejected
                </Badge>
              )}
            </div>
            <DialogDescription>
              Service Request Details · ID: {selectedRequest?.id?.slice(0, 8)}...
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Status Information Callouts */}
            {selectedRequest?.status === "Pending" && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                <p className="font-semibold">Under Review</p>
                <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                  Your request is awaiting administrative review. Once approved, a project will be scheduled and staff assigned.
                </p>
              </div>
            )}

            {selectedRequest?.status === "Approved" && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                <p className="font-semibold">Project Approved</p>
                <p className="mt-0.5 text-emerald-800 dark:text-emerald-300">
                  This request has been approved and moved into execution. Track progress in the &quot;Project progress&quot; section below.
                </p>
                {selectedRequest?.approved_at && (
                  <p className="mt-1 font-mono text-emerald-700 dark:text-emerald-400">
                    Approved date: {formatDate(selectedRequest.approved_at)}
                  </p>
                )}
                {selectedRequest?.admin_note && (
                  <p className="mt-1 italic">&quot;{selectedRequest.admin_note}&quot;</p>
                )}
              </div>
            )}

            {selectedRequest?.status === "Rejected" && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                <div className="flex items-center gap-1.5 font-semibold text-red-700 dark:text-red-300">
                  <XCircle className="h-4 w-4" />
                  Administrator Feedback / Reason for Rejection:
                </div>
                <div className="mt-1.5 rounded-md bg-white/70 p-2 text-sm font-medium text-red-950 dark:bg-black/20 dark:text-red-100">
                  {selectedRequest?.rejection_reason || selectedRequest?.admin_note || "No specific reason was provided."}
                </div>
                {selectedRequest?.rejected_at && (
                  <p className="mt-2 text-xs text-red-700 dark:text-red-400">
                    Reviewed on: {formatDate(selectedRequest.rejected_at)}
                  </p>
                )}
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  You are welcome to submit a revised request or contact our team for assistance.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border p-3">
                <span className="text-xs text-muted-foreground">Requested Service</span>
                <p className="mt-0.5 font-medium">{selectedRequest?.services?.name ?? "General Service"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <span className="text-xs text-muted-foreground">Submitted Date</span>
                <p className="mt-0.5 font-medium">{selectedRequest?.created_at ? formatDate(selectedRequest.created_at) : "-"}</p>
              </div>
              <div className="rounded-lg border p-3">
                <span className="text-xs text-muted-foreground">Proposed Budget</span>
                <p className="mt-0.5 font-medium">
                  {selectedRequest?.budget ? formatCurrency(selectedRequest.budget) : "Flexible"}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <span className="text-xs text-muted-foreground">Preferred Deadline</span>
                <p className="mt-0.5 font-medium">
                  {selectedRequest?.preferred_deadline ? formatDate(selectedRequest.preferred_deadline) : "Flexible"}
                </p>
              </div>
            </div>

            {selectedRequest?.details && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Description & Requirements</span>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                  {selectedRequest.details}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
