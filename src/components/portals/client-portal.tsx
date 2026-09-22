import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  CreditCard,
  Receipt,
  Search,
  Loader2,
  Sparkles,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useClientPortalData, useMyClient, useRespondToQuote } from "@/data/portals";
import { useCreateServiceRequest, useCancelServiceRequest } from "@/data/service-requests";
import { formatCurrency, formatDate } from "@/lib/format";
import { initiatePaystackPayment, verifyPaystackPayment } from "@/data/paystack";
import { ClientInvoiceDialog } from "@/components/invoices/client-invoice-dialog";
import { PaymentReceipt } from "@/components/payments/payment-receipt";
import { ClientProjectModal } from "@/components/projects/client-project-modal";
import { ClientProfileDialog } from "@/components/clients/client-profile-dialog";
import { getInvoicePaymentStatus } from "@/lib/invoice-status";

export function ClientPortal() {
  const queryClient = useQueryClient();
  const { data: client, isLoading: clientLoading } = useMyClient();
  const { data, isLoading } = useClientPortalData(client?.id);
  const { data: services = [] } = useServices();
  const createRequest = useCreateServiceRequest();
  const cancelRequest = useCancelServiceRequest();
  const respondToQuote = useRespondToQuote();
  const [serviceId, setServiceId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [preferredDeadline, setPreferredDeadline] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [selectedProject, setSelectedProject] = useState<any | null>(null);

  // Invoices & Payment States
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [verifiedPaymentRef, setVerifiedPaymentRef] = useState<string | null>(null);
  const [invoiceFilter, setInvoiceFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [receiptInvoice, setReceiptInvoice] = useState<any | null>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  // Handle Paystack callback verification on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference");
    if (!ref || isVerifyingPayment) return;

    setIsVerifyingPayment(true);
    verifyPaystackPayment(ref)
      .then((res) => {
        if (res.status === "success") {
          toast.success("Payment verified successfully! Your project is funded.");
          setVerifiedPaymentRef(ref);
        } else if (res.status === "abandoned") {
          toast.info("Payment session was cancelled. You can try again whenever ready.");
        } else {
          toast.error("Payment was not completed. Please try again.");
        }
        queryClient.invalidateQueries({ queryKey: ["client-portal"] });
        queryClient.invalidateQueries({ queryKey: ["invoices"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });

        // Clean query params
        const url = new URL(window.location.href);
        url.searchParams.delete("reference");
        url.searchParams.delete("payment");
        window.history.replaceState(
          {},
          "",
          url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""),
        );
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not verify payment");
      })
      .finally(() => {
        setIsVerifyingPayment(false);
      });
  }, [isVerifyingPayment, queryClient]);

  async function handlePayInvoice(invoiceToPay: any) {
    if (!invoiceToPay?.id || payingInvoiceId) return;
    const balance = Number(
      invoiceToPay.balance ?? Number(invoiceToPay.total) - Number(invoiceToPay.amount_paid ?? 0),
    );
    if (balance <= 0 || getInvoicePaymentStatus(invoiceToPay) === "Paid") {
      toast.info("This invoice is already settled.");
      return;
    }
    if (invoiceToPay.status === "Cancelled") {
      toast.error("This invoice has been cancelled and cannot be paid.");
      return;
    }

    try {
      setPayingInvoiceId(invoiceToPay.id);
      console.info("[Client Portal] Initializing Paystack checkout for invoice:", {
        invoiceId: invoiceToPay.id,
        invoiceNumber: invoiceToPay.invoice_number,
        projectId: invoiceToPay.project_id || invoiceToPay.projects?.id,
        balance,
      });
      const res = await initiatePaystackPayment({
        invoiceId: invoiceToPay.id,
        email: client?.email || undefined,
        callbackUrl: `${window.location.origin}/dashboard?payment=complete`,
      });
      if (res.authorizationUrl) {
        window.location.assign(res.authorizationUrl);
      }
    } catch (payErr) {
      toast.error(payErr instanceof Error ? payErr.message : "Failed to start Paystack checkout");
      setPayingInvoiceId(null);
    }
  }

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
  const quotes = (data as any)?.quotes ?? [];

  const pendingRequests = requests.filter((r: any) => r.status === "Pending");
  const approvedRequests = requests.filter((r: any) => r.status === "Approved");
  const rejectedRequests = requests.filter((r: any) => r.status === "Rejected");

  const unpaidInvoices = invoices.filter(
    (i: any) =>
      i.status !== "Cancelled" &&
      getInvoicePaymentStatus(i) !== "Paid" &&
      Number(i.balance ?? i.total) > 0,
  );
  const paidInvoices = invoices.filter(
    (i: any) => i.status !== "Cancelled" && getInvoicePaymentStatus(i) === "Paid",
  );

  async function handleCancelRequest(requestId: string) {
    if (!client?.id) return;
    try {
      await cancelRequest.mutateAsync(requestId);
      toast.success("Service request cancelled");
      if (selectedRequest?.id === requestId) {
        setSelectedRequest(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel request");
    }
  }

  async function handleQuoteResponse(quoteId: string, action: "accept" | "reject") {
    if (!client?.id) return;
    try {
      await respondToQuote.mutateAsync({
        quoteId,
        clientId: client.id,
        action,
      });
      toast.success(
        action === "accept"
          ? "Quote accepted! An invoice will be generated shortly."
          : "Quote declined.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to respond to quote");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client workspace</h1>
          <p className="text-muted-foreground">
            Request services, track your project progress, and review billing.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowProfileDialog(true)}
          className="gap-2 self-start sm:self-auto"
        >
          <User className="h-4 w-4" />
          Profile & Settings
        </Button>
      </div>

      {client.approval_status !== "Approved" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6 text-amber-900">
            Your account is {String(client.approval_status).toLowerCase()} and requests will be
            reviewed by the team.
          </CardContent>
        </Card>
      )}

      {/* Payment Success Confirmation Banner (Requirement 14 & 20) */}
      {verifiedPaymentRef && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50/90 p-4 text-emerald-950 shadow-xs dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100 animate-in fade-in duration-300">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Your payment has been successfully received.</p>
              <p className="text-sm text-emerald-800/90 dark:text-emerald-300/90">
                Transaction confirmed with Paystack (Ref:{" "}
                <span className="font-mono font-medium">{verifiedPaymentRef}</span>). Your project
                is now funded and in development.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-emerald-300 text-emerald-800 hover:bg-emerald-100 shrink-0"
            onClick={() => setVerifiedPaymentRef(null)}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Invoice Ready For Payment Banner (Requirement 14) */}
      {unpaidInvoices.length > 0 && !verifiedPaymentRef && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-amber-950 shadow-xs dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100">
          <div className="flex items-start sm:items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">
                Your invoice is ready for payment ({unpaidInvoices[0].invoice_number})
              </p>
              <p className="text-sm text-amber-800/90 dark:text-amber-300/90">
                Amount due:{" "}
                <span className="font-bold">
                  {formatCurrency(Number(unpaidInvoices[0].balance || unpaidInvoices[0].total))}
                </span>{" "}
                for{" "}
                {unpaidInvoices[0].projects?.services?.name ||
                  unpaidInvoices[0].projects?.title ||
                  "approved project"}
                .{unpaidInvoices.length > 1 && ` (${unpaidInvoices.length} total unpaid)`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-amber-300 hover:bg-amber-100"
              onClick={() => setSelectedInvoice(unpaidInvoices[0])}
            >
              View Invoice
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 shadow-xs"
              onClick={() => void handlePayInvoice(unpaidInvoices[0])}
              disabled={payingInvoiceId === unpaidInvoices[0].id}
            >
              {payingInvoiceId === unpaidInvoices[0].id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Preparing...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" /> Pay Now
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Rejection Notification Banner */}
      {rejectedRequests.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="text-sm">
            <p className="font-semibold">Review Update: Request Declined</p>
            <p className="text-red-700 dark:text-red-300">
              One or more of your submitted requests could not be approved. Click &quot;View
              details&quot; in My Requests to review the administrator&apos;s feedback.
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
                <label className="text-xs font-medium text-muted-foreground">
                  Select Service *
                </label>
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
                <label className="text-xs font-medium text-muted-foreground">
                  Details & Requirements
                </label>
                <Textarea
                  placeholder="Describe the scope, objectives, requirements, and deliverables..."
                  value={description}
                  rows={4}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Budget (Optional, NGN)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="e.g., 250000"
                    value={budget}
                    onChange={(event) => setBudget(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Preferred Deadline
                  </label>
                  <Input
                    type="date"
                    value={preferredDeadline}
                    onChange={(event) => setPreferredDeadline(event.target.value)}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full gap-2"
                disabled={createRequest.isPending || !serviceId}
              >
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
                        {request.services?.name ?? "Custom Service"} · Submitted{" "}
                        {formatDate(request.created_at)}
                      </p>
                    </div>
                    {request.status === "Pending" && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
                      >
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
                      {request.rejection_reason ||
                        request.admin_note ||
                        "Requirements could not be accommodated at this time."}
                    </div>
                  )}

                  {/* Approved project note */}
                  {request.status === "Approved" && (
                    <div className="space-y-1">
                      <div className="text-xs text-emerald-800 dark:text-emerald-300">
                        ✓ Approved and linked to active project delivery queue.
                      </div>
                      {request.assigned_staff && (
                        <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          Assigned Staff: {request.assigned_staff.full_name}
                          {request.assigned_staff.job_title
                            ? ` — ${request.assigned_staff.job_title}`
                            : ""}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-muted-foreground">
                      {request.budget
                        ? `Budget: ${formatCurrency(request.budget)}`
                        : "Budget: Flexible"}
                    </span>
                    <div className="flex items-center gap-1">
                      {request.status === "Pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => handleCancelRequest(request.id)}
                          disabled={cancelRequest.isPending}
                        >
                          Cancel
                        </Button>
                      )}
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
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Request Details Dialog */}
      <Dialog
        open={Boolean(selectedRequest)}
        onOpenChange={(open) => !open && setSelectedRequest(null)}
      >
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
                  Your request is awaiting administrative review. Once approved, a project will be
                  scheduled and staff assigned.
                </p>
              </div>
            )}

            {selectedRequest?.status === "Approved" && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                <p className="font-semibold">Project Approved</p>
                <p className="mt-0.5 text-emerald-800 dark:text-emerald-300">
                  This request has been approved and moved into execution. Track progress in the
                  &quot;Project progress&quot; section below.
                </p>
                {selectedRequest?.assigned_staff && (
                  <p className="mt-1 font-medium text-emerald-800 dark:text-emerald-200">
                    <span className="font-semibold">Assigned Staff:</span>{" "}
                    {selectedRequest.assigned_staff.full_name}
                    {selectedRequest.assigned_staff.job_title
                      ? ` — ${selectedRequest.assigned_staff.job_title}`
                      : ""}
                  </p>
                )}
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
                  {selectedRequest?.rejection_reason ||
                    selectedRequest?.admin_note ||
                    "No specific reason was provided."}
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
                <p className="mt-0.5 font-medium">
                  {selectedRequest?.services?.name ?? "General Service"}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <span className="text-xs text-muted-foreground">Submitted Date</span>
                <p className="mt-0.5 font-medium">
                  {selectedRequest?.created_at ? formatDate(selectedRequest.created_at) : "-"}
                </p>
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
                  {selectedRequest?.preferred_deadline
                    ? formatDate(selectedRequest.preferred_deadline)
                    : "Flexible"}
                </p>
              </div>
            </div>

            {selectedRequest?.details && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Description & Requirements
                </span>
                <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                  {selectedRequest.details}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
            {selectedRequest?.status === "Pending" ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleCancelRequest(selectedRequest.id)}
                disabled={cancelRequest.isPending}
              >
                Cancel Request
              </Button>
            ) : (
              <div />
            )}
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Card>
        <CardHeader>
          <CardTitle>Project progress</CardTitle>
          <CardDescription>
            Track your ongoing projects, download deliverables, request revisions, and message your
            project team.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Approved work will appear here.</p>
          ) : (
            projects.map((project: any) => (
              <div
                key={project.id}
                className="space-y-3 rounded-lg border p-4 transition hover:border-primary/50 hover:shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="font-semibold text-foreground text-base block">
                      {project.title}
                    </span>
                    {project.project_number && (
                      <span className="text-xs font-mono text-muted-foreground block">
                        #{project.project_number}
                      </span>
                    )}
                    {project.assigned_staff && (
                      <p className="text-xs text-muted-foreground">
                        Assigned: {project.assigned_staff.full_name}
                        {project.assigned_staff.job_title
                          ? ` — ${project.assigned_staff.job_title}`
                          : ""}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {project.status}
                  </Badge>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${project.progress}%` }} />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground pt-1">
                  <span>{project.progress}% complete</span>
                  <span>
                    {project.deadline ? `Due ${formatDate(project.deadline)}` : "No deadline"}
                  </span>
                </div>
                <div className="pt-2 border-t flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-primary/40 text-primary hover:bg-primary/5"
                    onClick={() => setSelectedProject(project)}
                  >
                    <FolderKanban className="h-4 w-4" />
                    Inspect Deliverables & Collaboration
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* QUOTATIONS SECTION */}
      {quotes.length > 0 && (
        <Card className="shadow-xs border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <FileText className="h-5 w-5 text-primary" /> Quotations & Estimates
            </CardTitle>
            <CardDescription>
              Review proposals and estimates submitted for your project requests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quotes.map((quote: any) => (
              <div
                key={quote.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border p-4 hover:bg-muted/20 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground">
                      {quote.quote_number}
                    </span>
                    <Badge
                      className={
                        quote.status === "Accepted"
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : quote.status === "Rejected"
                            ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                            : quote.status === "Sent"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-muted text-muted-foreground"
                      }
                    >
                      {quote.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {quote.quote_items?.[0]?.description || "Service Quotation"} ·{" "}
                    {quote.expiry_date
                      ? `Valid until ${formatDate(quote.expiry_date)}`
                      : "No expiration"}
                  </p>
                  <p className="text-base font-bold text-foreground mt-1">
                    {formatCurrency(Number(quote.total))}
                  </p>
                </div>

                {quote.status === "Sent" && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleQuoteResponse(quote.id, "reject")}
                      disabled={respondToQuote.isPending}
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                      onClick={() => handleQuoteResponse(quote.id, "accept")}
                      disabled={respondToQuote.isPending}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Accept Quote
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {/* INVOICES SECTION (Requirement 4 & 5) */}
      <Card className="shadow-xs border">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <FileText className="h-5 w-5 text-primary" /> Invoices & Billing
            </CardTitle>
            <CardDescription>
              Review your project invoices, payment history, and pay online with Paystack
            </CardDescription>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoice or service..."
                className="pl-8 text-xs h-9"
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
              />
            </div>
            <Tabs
              value={invoiceFilter}
              onValueChange={(v) => setInvoiceFilter(v as any)}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid grid-cols-3 h-9">
                <TabsTrigger value="all" className="text-xs">
                  All ({invoices.length})
                </TabsTrigger>
                <TabsTrigger value="unpaid" className="text-xs">
                  Unpaid ({unpaidInvoices.length})
                </TabsTrigger>
                <TabsTrigger value="paid" className="text-xs">
                  Paid ({paidInvoices.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent>
          {(() => {
            const filtered = invoices.filter((inv: any) => {
              if (inv.status === "Cancelled") return false;
              const status = getInvoicePaymentStatus(inv);
              if (invoiceFilter === "unpaid" && status === "Paid") return false;
              if (invoiceFilter === "paid" && status !== "Paid") return false;

              if (invoiceSearch.trim()) {
                const q = invoiceSearch.toLowerCase();
                const num = (inv.invoice_number || "").toLowerCase();
                const sName = (inv.projects?.services?.name || "").toLowerCase();
                const pTitle = (inv.projects?.title || "").toLowerCase();
                if (!num.includes(q) && !sName.includes(q) && !pTitle.includes(q)) return false;
              }
              return true;
            });

            if (invoices.length === 0) {
              return (
                <div className="text-center py-12 border rounded-lg bg-muted/20">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground/60 mb-2" />
                  <p className="font-semibold text-foreground">No invoices generated yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    When the administrator approves your service request, an invoice will be
                    automatically generated here for instant payment.
                  </p>
                </div>
              );
            }

            if (filtered.length === 0) {
              return (
                <div className="text-center py-8 border rounded-lg bg-muted/10">
                  <p className="text-sm text-muted-foreground">
                    No invoices matching the selected filter or search term.
                  </p>
                </div>
              );
            }

            return (
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b">
                    <tr>
                      <th className="py-3 px-4 text-left">Invoice</th>
                      <th className="py-3 px-4 text-left">Service / Project</th>
                      <th className="py-3 px-4 text-left">Amount</th>
                      <th className="py-3 px-4 text-left hidden md:table-cell">Issue Date</th>
                      <th className="py-3 px-4 text-left hidden md:table-cell">Due Date</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((inv: any) => {
                      const status = getInvoicePaymentStatus(inv);
                      const isPaid = status === "Paid";
                      const sName =
                        inv.projects?.services?.name ||
                        inv.projects?.title ||
                        inv.invoice_items?.[0]?.description ||
                        "Service Request";

                      return (
                        <tr
                          key={inv.id}
                          className="hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => setSelectedInvoice(inv)}
                        >
                          <td className="py-3 px-4 font-mono font-bold text-foreground">
                            {inv.invoice_number}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-foreground block max-w-[200px] truncate">
                              {sName}
                            </span>
                            {inv.projects?.project_number && (
                              <span className="text-[11px] text-muted-foreground block font-mono">
                                #{inv.projects.project_number}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-foreground">
                            {formatCurrency(Number(inv.total))}
                            {status === "Partially Paid" && (
                              <span className="text-xs text-amber-600 block">
                                Bal: {formatCurrency(Number(inv.balance))}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                            {formatDate(inv.issue_date)}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground hidden md:table-cell">
                            {inv.due_date ? formatDate(inv.due_date) : "Upon receipt"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge
                              className={
                                isPaid
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200"
                                  : status === "Overdue"
                                    ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 hover:bg-red-200"
                                    : status === "Partially Paid"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-200"
                                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 hover:bg-amber-200"
                              }
                            >
                              {status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs font-medium"
                                onClick={() => setSelectedInvoice(inv)}
                              >
                                <Eye className="h-3.5 w-3.5 mr-1" /> View
                              </Button>

                              {!isPaid ? (
                                <Button
                                  size="sm"
                                  className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs gap-1.5 shadow-xs"
                                  onClick={() => void handlePayInvoice(inv)}
                                  disabled={payingInvoiceId === inv.id}
                                >
                                  {payingInvoiceId === inv.id ? (
                                    <>
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Starting...
                                    </>
                                  ) : (
                                    <>
                                      <CreditCard className="h-3.5 w-3.5" /> Pay Now
                                    </>
                                  )}
                                </Button>
                              ) : (
                                Number(inv.amount_paid) > 0 && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs gap-1 font-medium"
                                    onClick={() => setReceiptInvoice(inv)}
                                  >
                                    <Receipt className="h-3.5 w-3.5" /> Receipt
                                  </Button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* Client Project Collaboration & Deliverables Modal */}
      {selectedProject && (
        <ClientProjectModal
          project={selectedProject}
          open={Boolean(selectedProject)}
          onOpenChange={(open) => !open && setSelectedProject(null)}
        />
      )}

      {/* Invoice Details Modal (Requirement 5) */}
      <ClientInvoiceDialog
        open={Boolean(selectedInvoice)}
        onOpenChange={(open) => !open && setSelectedInvoice(null)}
        invoice={selectedInvoice}
        client={client}
        onPayNow={handlePayInvoice}
        isPaying={payingInvoiceId === selectedInvoice?.id}
      />

      {/* Payment Receipt Dialog */}
      {receiptInvoice && (
        <PaymentReceipt
          invoice={receiptInvoice}
          payments={receiptInvoice.payments ?? []}
          open={Boolean(receiptInvoice)}
          onOpenChange={(open) => !open && setReceiptInvoice(null)}
        />
      )}

      {/* Client Profile Settings Dialog */}
      <ClientProfileDialog
        open={showProfileDialog}
        onOpenChange={setShowProfileDialog}
        client={client}
      />
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
