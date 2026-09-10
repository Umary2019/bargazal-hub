import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Eye,
  Check,
  X,
  Copy,
  ExternalLink,
  Users,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Calendar,
  DollarSign,
  Briefcase,
} from "lucide-react";

import { ProtectedRoute } from "@/components/app/protected-route";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  useApproveServiceRequest,
  useRejectServiceRequest,
  useServiceRequests,
  useServiceRequestInvoice,
  type ServiceRequest,
} from "@/data/service-requests";
import { useServices } from "@/data/services";
import { useStaff } from "@/data/staff";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/requests")({ component: RequestsPage });

function RequestsPage() {
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();
  const { data: requests = [], isLoading, error: requestsError, refetch } = useServiceRequests();
  const { data: staff = [], isLoading: isStaffLoading, isError: isStaffError } = useStaff(isAdmin);
  const { data: services = [] } = useServices();
  const approveRequest = useApproveServiceRequest();
  const rejectRequest = useRejectServiceRequest();

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<"service-requests" | "clients" | "staff">(
    "service-requests",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");

  // Modal dialog states
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const { data: selectedRequestInvoice } = useServiceRequestInvoice(
    selectedRequest?.id,
    selectedRequest?.project_id,
  );
  const [approveDialogRequest, setApproveDialogRequest] = useState<ServiceRequest | null>(null);
  const [rejectDialogRequest, setRejectDialogRequest] = useState<ServiceRequest | null>(null);

  // Approve dialog form states
  const [assignedStaffId, setAssignedStaffId] = useState<string>("unassigned");
  const [approveNote, setApproveNote] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState<string>("");
  const [invoiceDueDate, setInvoiceDueDate] = useState<string>("");

  // Reject dialog form states
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState("");

  // Client and staff registration queries
  const { data: pendingClients = [] } = useQuery({
    queryKey: ["pending-client-registrations"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clients")
        .select("id, full_name, email, phone, approval_status, created_at")
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
        .select("id, full_name, email, phone, job_title, approval_status, created_at")
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
      void queryClient.invalidateQueries({ queryKey: ["clients"] });
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

  // Filtered requests list
  const filteredRequests = useMemo(() => {
    return requests
      .filter((req) => {
        const query = searchTerm.toLowerCase();
        const matchesSearch =
          !searchTerm.trim() ||
          req.title.toLowerCase().includes(query) ||
          req.id.toLowerCase().includes(query) ||
          (req.clients?.full_name?.toLowerCase().includes(query) ?? false) ||
          (req.clients?.email?.toLowerCase().includes(query) ?? false) ||
          (req.services?.name?.toLowerCase().includes(query) ?? false);

        const matchesStatus =
          statusFilter === "all" || req.status.toLowerCase() === statusFilter.toLowerCase();

        const matchesService = serviceFilter === "all" || req.service_id === serviceFilter;

        return matchesSearch && matchesStatus && matchesService;
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortBy === "newest" ? dateB - dateA : dateA - dateB;
      });
  }, [requests, searchTerm, statusFilter, serviceFilter, sortBy]);

  // Request status counts
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === "Pending").length;
  const approvedCount = requests.filter((r) => r.status === "Approved").length;
  const rejectedCount = requests.filter((r) => r.status === "Rejected").length;

  function handleOpenApproveDialog(request: ServiceRequest) {
    setApproveDialogRequest(request);
    setAssignedStaffId("unassigned");
    setApproveNote("");
    setInvoiceAmount(String(request.budget || 0));
    const defaultDue =
      request.preferred_deadline ||
      new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
    setInvoiceDueDate(defaultDue);
  }

  async function handleConfirmApprove() {
    if (!approveDialogRequest) return;
    try {
      await approveRequest.mutateAsync({
        request: approveDialogRequest,
        assignedStaffId: assignedStaffId === "unassigned" ? null : assignedStaffId,
        note: approveNote.trim() || undefined,
        invoiceAmount: Number(invoiceAmount) || 0,
        dueDate: invoiceDueDate || undefined,
      });
      setApproveDialogRequest(null);
      if (selectedRequest?.id === approveDialogRequest.id) {
        setSelectedRequest(null);
      }
    } catch {
      // Error handled by mutation hook
    }
  }

  function handleOpenRejectDialog(request: ServiceRequest) {
    setRejectDialogRequest(request);
    setRejectionReason("");
    setRejectionError("");
  }

  async function handleConfirmReject() {
    if (!rejectDialogRequest) return;
    const cleanReason = rejectionReason.trim();
    if (!cleanReason) {
      setRejectionError("Please provide a reason for rejecting this service request.");
      return;
    }
    setRejectionError("");
    try {
      await rejectRequest.mutateAsync({
        id: rejectDialogRequest.id,
        reason: cleanReason,
        currentStatus: rejectDialogRequest.status,
        requestTitle: rejectDialogRequest.title,
      });
      setRejectDialogRequest(null);
      if (selectedRequest?.id === rejectDialogRequest.id) {
        setSelectedRequest(null);
      }
    } catch {
      // Error handled by mutation hook
    }
  }

  function copyToClipboard(text: string) {
    void navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  return (
    <ProtectedRoute roles={["admin", "staff"]}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Service Requests</h1>
            <p className="text-muted-foreground">
              Review, approve, assign staff, and track client project requests.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 self-start sm:self-auto"
            onClick={() => void refetch()}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
          <TabsList className="grid w-full grid-cols-3 sm:w-auto">
            <TabsTrigger value="service-requests" className="gap-2">
              <Inbox className="h-4 w-4" />
              Service Requests
              {pendingCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2">
              <Users className="h-4 w-4" />
              Client Registrations
              {pendingClients.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-blue-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {pendingClients.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="staff" className="gap-2">
              <UserCheck className="h-4 w-4" />
              Staff Registrations
              {pendingStaff.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-purple-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {pendingStaff.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: SERVICE REQUESTS */}
          <TabsContent value="service-requests" className="space-y-6 pt-2">
            {requestsError ? (
              <Card className="border-destructive bg-destructive/5">
                <CardContent className="flex items-center gap-3 pt-6 text-sm text-destructive">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <div>
                    <p className="font-semibold">Could not load service requests</p>
                    <p>{requestsError.message}</p>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Card className="shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Requests
                  </CardTitle>
                  <Inbox className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalCount}</div>
                  <p className="text-xs text-muted-foreground">All client project requests</p>
                </CardContent>
              </Card>

              <Card className="border-amber-200 bg-amber-50/40 shadow-xs dark:border-amber-800/50 dark:bg-amber-950/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-amber-900 dark:text-amber-300">
                    Pending Review
                  </CardTitle>
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    {pendingCount}
                  </div>
                  <p className="text-xs text-amber-800/80 dark:text-amber-400/80">
                    Action required
                  </p>
                </CardContent>
              </Card>

              <Card className="border-emerald-200 bg-emerald-50/40 shadow-xs dark:border-emerald-800/50 dark:bg-emerald-950/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-900 dark:text-emerald-300">
                    Approved
                  </CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {approvedCount}
                  </div>
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80">
                    Converted to projects
                  </p>
                </CardContent>
              </Card>

              <Card className="border-red-200 bg-red-50/40 shadow-xs dark:border-red-800/50 dark:bg-red-950/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-red-900 dark:text-red-300">
                    Rejected
                  </CardTitle>
                  <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {rejectedCount}
                  </div>
                  <p className="text-xs text-red-800/80 dark:text-red-400/80">Declined requests</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters Toolbar */}
            <Card className="shadow-xs">
              <CardContent className="space-y-4 pt-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search title, client, email..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger aria-label="Filter by status">
                      <SelectValue placeholder="Status: All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Status: All</SelectItem>
                      <SelectItem value="pending">Pending ({pendingCount})</SelectItem>
                      <SelectItem value="approved">Approved ({approvedCount})</SelectItem>
                      <SelectItem value="rejected">Rejected ({rejectedCount})</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Service Filter */}
                  <Select value={serviceFilter} onValueChange={setServiceFilter}>
                    <SelectTrigger aria-label="Filter by service">
                      <SelectValue placeholder="Service: All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Service: All</SelectItem>
                      {services.map((svc) => (
                        <SelectItem key={svc.id} value={svc.id}>
                          {svc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Date Sorting */}
                  <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                    <SelectTrigger aria-label="Sort by date">
                      <SelectValue placeholder="Sort by date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Sort: Newest First</SelectItem>
                      <SelectItem value="oldest">Sort: Oldest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(searchTerm || statusFilter !== "all" || serviceFilter !== "all") && (
                  <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span>
                      Showing {filteredRequests.length} of {requests.length} request(s)
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                        setServiceFilter("all");
                      }}
                    >
                      Reset filters
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Requests Table */}
            <Card className="shadow-xs">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Client Service Requests</CardTitle>
                  <CardDescription>
                    {filteredRequests.length} request{filteredRequests.length === 1 ? "" : "s"}{" "}
                    found
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="space-y-3 p-6">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-12 w-full animate-pulse rounded-md bg-muted" />
                    ))}
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <Inbox className="mx-auto mb-2 h-10 w-10 opacity-40" />
                    <p className="font-medium">No service requests found</p>
                    <p className="text-xs">
                      {searchTerm || statusFilter !== "all"
                        ? "Try clearing your search or filter options"
                        : "When clients submit service requests, they will appear here."}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-24">ID</TableHead>
                          <TableHead>Title & Client</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Budget</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredRequests.map((req) => (
                          <TableRow key={req.id} className="hover:bg-muted/30">
                            {/* Request ID */}
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              <button
                                type="button"
                                className="flex items-center gap-1 hover:text-foreground"
                                onClick={() => copyToClipboard(req.id)}
                                title="Click to copy full ID"
                              >
                                {req.id.slice(0, 8)}
                                <Copy className="h-3 w-3 opacity-60" />
                              </button>
                            </TableCell>

                            {/* Title & Client */}
                            <TableCell>
                              <div className="space-y-0.5">
                                <p className="font-medium text-foreground">{req.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {req.clients?.full_name ?? "Client"}{" "}
                                  {req.clients?.email ? `· ${req.clients.email}` : ""}
                                </p>
                              </div>
                            </TableCell>

                            {/* Service */}
                            <TableCell>
                              <Badge variant="secondary" className="font-normal">
                                {req.services?.name ?? "General Service"}
                              </Badge>
                            </TableCell>

                            {/* Budget & Deadline */}
                            <TableCell className="text-xs">
                              <p className="font-medium">
                                {req.budget ? formatCurrency(req.budget) : "Flexible"}
                              </p>
                              {req.preferred_deadline && (
                                <p className="text-muted-foreground">
                                  Due: {formatDate(req.preferred_deadline)}
                                </p>
                              )}
                            </TableCell>

                            {/* Submitted Date */}
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDate(req.created_at)}
                            </TableCell>

                            {/* Status */}
                            <TableCell>
                              {req.status === "Pending" && (
                                <Badge
                                  variant="outline"
                                  className="gap-1 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                >
                                  <Clock className="h-3 w-3" />
                                  Pending
                                </Badge>
                              )}
                              {req.status === "Approved" && (
                                <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Approved
                                </Badge>
                              )}
                              {req.status === "Rejected" && (
                                <Badge variant="destructive" className="gap-1">
                                  <XCircle className="h-3 w-3" />
                                  Rejected
                                </Badge>
                              )}
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 gap-1 text-xs"
                                  onClick={() => setSelectedRequest(req)}
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Details
                                </Button>

                                {req.status === "Pending" && isAdmin && (
                                  <>
                                    <Button
                                      size="sm"
                                      className="h-8 gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                                      onClick={() => handleOpenApproveDialog(req)}
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 gap-1 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                                      onClick={() => handleOpenRejectDialog(req)}
                                    >
                                      <X className="h-3.5 w-3.5" />
                                      Reject
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: CLIENT REGISTRATIONS */}
          <TabsContent value="clients" className="space-y-4 pt-2">
            <Card>
              <CardHeader>
                <CardTitle>Pending Client Registrations</CardTitle>
                <CardDescription>
                  Review clients who created an account and require authorization before signing in.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingClients.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No pending client registrations.
                  </p>
                ) : (
                  pendingClients.map((client: any) => (
                    <div
                      key={client.id}
                      className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{client.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {client.email} · {client.phone || "No phone"} · Registered{" "}
                          {formatDate(client.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => approveClient(client.id, true)}>
                          Approve Client
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
          </TabsContent>

          {/* TAB 3: STAFF REGISTRATIONS */}
          <TabsContent value="staff" className="space-y-4 pt-2">
            <Card>
              <CardHeader>
                <CardTitle>Pending Staff Registrations</CardTitle>
                <CardDescription>Review and authorize staff onboarding requests.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingStaff.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No pending staff registrations.
                  </p>
                ) : (
                  pendingStaff.map((member: any) => (
                    <div
                      key={member.id}
                      className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-foreground">{member.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.email} · Role: {member.job_title ?? "Staff"} · Registered{" "}
                          {formatDate(member.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => approveStaff(member.id, true)}>
                          Approve Staff
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveStaff(member.id, false)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* MODAL 1: COMPLETE REQUEST DETAILS */}
        <Dialog
          open={Boolean(selectedRequest)}
          onOpenChange={(open) => !open && setSelectedRequest(null)}
        >
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <div className="flex items-center justify-between gap-3 pr-6">
                <DialogTitle className="text-xl font-bold">{selectedRequest?.title}</DialogTitle>
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
              <DialogDescription className="font-mono text-xs">
                Request ID: {selectedRequest?.id}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-sm">
              {/* If Rejected: Rejection Reason Callout */}
              {selectedRequest?.status === "Rejected" && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                  <p className="font-semibold text-red-800 dark:text-red-300">
                    Rejection Reason (Visible to Client):
                  </p>
                  <p className="mt-1 rounded bg-white/70 p-2 text-sm font-medium text-red-950 dark:bg-black/20 dark:text-red-100">
                    {selectedRequest?.rejection_reason ||
                      selectedRequest?.admin_note ||
                      "No reason specified."}
                  </p>
                  {selectedRequest?.rejected_at && (
                    <p className="mt-2 text-xs text-red-700 dark:text-red-400">
                      Rejected on: {formatDate(selectedRequest.rejected_at)}
                    </p>
                  )}
                </div>
              )}

              {/* If Approved: Approval Info Callout */}
              {selectedRequest?.status === "Approved" && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                  <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                    Approval Details:
                  </p>
                  <p className="mt-0.5">
                    This request has been approved and created as an active project.
                  </p>
                  {selectedRequest?.approved_at && (
                    <p className="mt-1 font-mono">
                      Approved at: {formatDate(selectedRequest.approved_at)}
                    </p>
                  )}
                  {selectedRequest?.projects?.assigned_staff_id &&
                    (() => {
                      const assigned = staff.find(
                        (s) =>
                          s.id === selectedRequest.projects?.assigned_staff_id ||
                          s.user_id === selectedRequest.projects?.assigned_staff_id,
                      );
                      return (
                        <p className="mt-1 font-medium text-emerald-800 dark:text-emerald-200">
                          <span className="font-semibold">Assigned Staff:</span>{" "}
                          {assigned
                            ? `${assigned.full_name}${assigned.job_title ? ` — ${assigned.job_title}` : ""}`
                            : "Staff Member Assigned"}
                        </p>
                      );
                    })()}
                  {selectedRequest?.project_id && (
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <Link
                        to="/projects/$id"
                        params={{ id: selectedRequest.project_id }}
                        className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline dark:text-emerald-300"
                      >
                        View Created Project <ExternalLink className="h-3 w-3" />
                      </Link>
                      {selectedRequestInvoice && (
                        <Link
                          to="/invoices/$id"
                          params={{ id: selectedRequestInvoice.id }}
                          className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline dark:text-blue-300"
                        >
                          View Invoice ({selectedRequestInvoice.invoice_number}){" "}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  )}
                  {selectedRequestInvoice && (
                    <div className="mt-2 rounded border border-blue-200 bg-blue-50/70 p-2 text-xs text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
                      <span className="font-semibold">Linked Invoice: </span>
                      <span className="font-mono">{selectedRequestInvoice.invoice_number}</span> — Total:{" "}
                      <span className="font-semibold">{formatCurrency(selectedRequestInvoice.total)}</span> (
                      <span
                        className={
                          selectedRequestInvoice.status === "Paid"
                            ? "font-semibold text-emerald-700 dark:text-emerald-300"
                            : "font-semibold text-amber-700 dark:text-amber-300"
                        }
                      >
                        {selectedRequestInvoice.status}
                      </span>
                      )
                    </div>
                  )}
                </div>
              )}

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <span className="text-xs text-muted-foreground">Client Name</span>
                  <p className="mt-0.5 font-medium">
                    {selectedRequest?.clients?.full_name ?? "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedRequest?.clients?.email ?? "-"}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <span className="text-xs text-muted-foreground">Service Category</span>
                  <p className="mt-0.5 font-medium">
                    {selectedRequest?.services?.name ?? "General Service"}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <span className="text-xs text-muted-foreground">Proposed Budget</span>
                  <p className="mt-0.5 font-medium">
                    {selectedRequest?.budget ? formatCurrency(selectedRequest.budget) : "Flexible"}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <span className="text-xs text-muted-foreground">Target Deadline</span>
                  <p className="mt-0.5 font-medium">
                    {selectedRequest?.preferred_deadline
                      ? formatDate(selectedRequest.preferred_deadline)
                      : "Not specified"}
                  </p>
                </div>
              </div>

              {/* Description */}
              {selectedRequest?.details && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Requirements & Details
                  </span>
                  <div className="max-h-48 overflow-y-auto rounded-lg border bg-muted/20 p-3 text-sm whitespace-pre-wrap">
                    {selectedRequest.details}
                  </div>
                </div>
              )}

              {/* Admin Note if any */}
              {selectedRequest?.admin_note && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Administrative Note
                  </span>
                  <div className="rounded-lg border bg-muted/20 p-2.5 text-xs">
                    {selectedRequest.admin_note}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                Close
              </Button>

              {selectedRequest?.status === "Pending" && isAdmin && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
                    onClick={() => {
                      const req = selectedRequest;
                      setSelectedRequest(null);
                      handleOpenRejectDialog(req);
                    }}
                  >
                    Reject Request
                  </Button>
                  <Button
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => {
                      const req = selectedRequest;
                      setSelectedRequest(null);
                      handleOpenApproveDialog(req);
                    }}
                  >
                    Approve & Create Job
                  </Button>
                </div>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL 2: APPROVE REQUEST CONFIRMATION DIALOG */}
        <Dialog
          open={Boolean(approveDialogRequest)}
          onOpenChange={(open) => !open && setApproveDialogRequest(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                Approve Service Request
              </DialogTitle>
              <DialogDescription>
                Confirm approval for &quot;{approveDialogRequest?.title}&quot;. This will generate
                an active project.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
                <p>
                  <span className="font-semibold">Client:</span>{" "}
                  {approveDialogRequest?.clients?.full_name}
                </p>
                <p>
                  <span className="font-semibold">Service:</span>{" "}
                  {approveDialogRequest?.services?.name}
                </p>
                <p>
                  <span className="font-semibold">Budget:</span>{" "}
                  {approveDialogRequest?.budget
                    ? formatCurrency(approveDialogRequest.budget)
                    : "Flexible"}
                </p>
              </div>

              {/* Staff Assignment */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">
                    Assign Staff Member (Optional)
                  </label>
                  {isStaffLoading && (
                    <span className="text-[10px] text-muted-foreground animate-pulse">
                      Loading staff...
                    </span>
                  )}
                </div>
                <Select
                  value={assignedStaffId}
                  onValueChange={setAssignedStaffId}
                  disabled={isStaffLoading}
                >
                  <SelectTrigger aria-label="Assign staff member">
                    <SelectValue
                      placeholder={
                        isStaffLoading
                          ? "Loading eligible staff..."
                          : "Select staff member (Optional)"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {isStaffLoading && (
                      <SelectItem value="__loading" disabled>
                        Loading eligible staff...
                      </SelectItem>
                    )}
                    {isStaffError && (
                      <SelectItem value="__error" disabled>
                        Failed to load staff members
                      </SelectItem>
                    )}
                    {!isStaffLoading && !isStaffError && staff.length === 0 && (
                      <SelectItem value="__empty" disabled>
                        No eligible staff members found
                      </SelectItem>
                    )}
                    {staff.map((member) => (
                      <SelectItem
                        key={member.id || member.user_id}
                        value={member.id || member.user_id}
                      >
                        {member.full_name || member.email}
                        {member.job_title ? ` — ${member.job_title}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

                {/* Automatic Invoice Generation Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Invoice Amount (₦) *
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="0.00"
                      value={invoiceAmount}
                      onChange={(e) => setInvoiceAmount(e.target.value)}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Auto-creates an invoice for this client
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">
                      Payment Due Date *
                    </label>
                    <Input
                      type="date"
                      value={invoiceDueDate}
                      onChange={(e) => setInvoiceDueDate(e.target.value)}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      Default: {approveDialogRequest?.preferred_deadline ? "Client preferred" : "14 days"}
                    </span>
                  </div>
                </div>

                {/* Admin Note */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">
                    Admin / Kickoff Note (Optional)
                  </label>
                  <Textarea
                    placeholder="Add any internal kickoff instructions or client note..."
                    rows={2}
                    value={approveNote}
                    onChange={(e) => setApproveNote(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setApproveDialogRequest(null)}
                  disabled={approveRequest.isPending}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={() => void handleConfirmApprove()}
                  disabled={approveRequest.isPending}
                >
                  {approveRequest.isPending ? "Approving & Invoicing..." : "Approve & Generate Invoice"}
                </Button>
              </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL 3: REJECT REQUEST DIALOG WITH MANDATORY REASON */}
        <Dialog
          open={Boolean(rejectDialogRequest)}
          onOpenChange={(open) => !open && setRejectDialogRequest(null)}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                Reject Service Request
              </DialogTitle>
              <DialogDescription>
                Decline &quot;{rejectDialogRequest?.title}&quot;. You must provide a reason so the
                client understands the decision.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Reason for Rejection <span className="text-destructive">*</span>
                </label>
                <Textarea
                  placeholder="Explain why this request is declined (e.g., Capacity full for selected timeline, requirements out of scope, budget below baseline)..."
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => {
                    setRejectionReason(e.target.value);
                    if (rejectionError) setRejectionError("");
                  }}
                  className={
                    rejectionError ? "border-destructive focus-visible:ring-destructive" : ""
                  }
                  required
                />
                {rejectionError && (
                  <p className="text-xs font-medium text-destructive">{rejectionError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  This explanation will be shown directly on the client&apos;s workspace.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setRejectDialogRequest(null)}
                disabled={rejectRequest.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => void handleConfirmReject()}
                disabled={rejectRequest.isPending || !rejectionReason.trim()}
              >
                {rejectRequest.isPending ? "Declining..." : "Confirm Rejection"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  );
}
