import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Eye,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { ProtectedRoute } from "@/components/app/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useInvoices, useDeleteInvoice } from "@/data/invoices";
import type { InvoiceWithRelations } from "@/data/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import { InvoiceFormDialog } from "@/components/invoices/invoice-form-dialog";
import { getInvoicePaymentStatus } from "@/lib/invoice-status";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { useBusinessSettings } from "@/data/settings";
import { downloadInvoicePdf } from "@/lib/pdf";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/invoices")({
  component: InvoicesPage,
});

function InvoicesPage() {
  const location = useLocation();
  return location.pathname !== "/invoices" ? <Outlet /> : <InvoicesCollection />;
}

function InvoicesCollection() {
  const { data: invoices = [], isLoading } = useInvoices();
  const { data: settings } = useBusinessSettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [remindingId, setRemindingId] = useState<string | null>(null);
  const deleteInvoice = useDeleteInvoice();

  // Summary KPI Metrics
  const stats = useMemo(() => {
    let totalInvoices = invoices.length;
    let unpaidCount = 0;
    let paidCount = 0;
    let overdueCount = 0;
    let totalRevenue = 0;

    for (const inv of invoices) {
      const status = getInvoicePaymentStatus(inv);
      const paid = Number(inv.amount_paid) || 0;
      totalRevenue += paid;

      if (status === "Paid") {
        paidCount++;
      } else if (status === "Overdue") {
        overdueCount++;
      } else if (status === "Unpaid") {
        unpaidCount++;
      }
    }

    return { totalInvoices, unpaidCount, paidCount, overdueCount, totalRevenue };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !q ||
        invoice.invoice_number.toLowerCase().includes(q) ||
        (invoice.clients?.full_name.toLowerCase().includes(q) ?? false) ||
        (invoice.clients?.email?.toLowerCase().includes(q) ?? false) ||
        (invoice.projects?.title?.toLowerCase().includes(q) ?? false) ||
        (invoice.projects?.services?.name?.toLowerCase().includes(q) ?? false);

      const computedStatus = getInvoicePaymentStatus(invoice);
      const matchesStatus =
        statusFilter === "all" ||
        computedStatus === statusFilter;

      const matchesDate = (() => {
        if (dateFilter === "all") return true;
        const issueDate = new Date(invoice.issue_date);
        const now = new Date();
        if (dateFilter === "today") {
          return (
            issueDate.getFullYear() === now.getFullYear() &&
            issueDate.getMonth() === now.getMonth() &&
            issueDate.getDate() === now.getDate()
          );
        }
        if (dateFilter === "month") {
          return (
            issueDate.getFullYear() === now.getFullYear() &&
            issueDate.getMonth() === now.getMonth()
          );
        }
        if (dateFilter === "year") {
          return issueDate.getFullYear() === now.getFullYear();
        }
        return true;
      })();

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [invoices, searchTerm, statusFilter, dateFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300";
      case "Partially Paid":
        return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300";
      case "Pending":
      case "Sent":
      case "Unpaid":
        return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300";
      case "Overdue":
        return "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/50 dark:text-red-300";
      case "Cancelled":
      case "Draft":
        return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  const handleDownloadPdf = async (invoice: InvoiceWithRelations) => {
    setDownloadingId(invoice.id);
    try {
      const { data: items = [] } = await supabase
        .from("invoice_items")
        .select("*")
        .eq("invoice_id", invoice.id);

      const lineItems =
        items && items.length > 0
          ? items
          : [
              {
                description: invoice.projects?.title ?? "Professional Service Fee",
                quantity: 1,
                unit_price: Number(invoice.total),
              },
            ];

      downloadInvoicePdf({
        invoice,
        items: lineItems,
        clientName: invoice.clients?.full_name ?? "Client",
        businessName: settings?.business_name ?? "Bargazal and Sons Tech Solutions",
        businessEmail: settings?.email,
        businessPhone: settings?.phone,
        paymentInstructions: settings?.payment_instructions,
      });
      toast.success("Invoice PDF downloaded successfully");
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSendReminder = async (invoice: InvoiceWithRelations) => {
    setRemindingId(invoice.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-invoice-notification", {
        body: { invoiceId: invoice.id, channels: ["email"] },
      });
      if (error) throw error;
      toast.success(`Payment reminder sent to ${invoice.clients?.email || "client"}`);
    } catch {
      // Fallback: Copy public secure payment link
      try {
        const { data: token, error: tokenError } = await supabase.rpc(
          "create_invoice_public_token" as never,
          { _invoice_id: invoice.id } as never,
        );
        if (tokenError || !token) throw tokenError ?? new Error("Token generation failed");
        const url = `${window.location.origin}/public/invoices/${token}`;
        await navigator.clipboard.writeText(url);
        toast.success("Secure invoice payment link copied to clipboard");
      } catch {
        toast.error("Could not send automated reminder. Client can view invoice in client portal.");
      }
    } finally {
      setRemindingId(null);
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
            <p className="text-muted-foreground">Manage, track, and monitor customer invoices</p>
          </div>
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            New Invoice
          </Button>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInvoices}</div>
              <p className="text-xs text-muted-foreground">All generated invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unpaid</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.unpaidCount}</div>
              <p className="text-xs text-muted-foreground">Awaiting client payment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{stats.paidCount}</div>
              <p className="text-xs text-muted-foreground">Fully settled invoices</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.overdueCount}</div>
              <p className="text-xs text-muted-foreground">Past payment due date</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">Collected revenue to date</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoice #, client, or service..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment Statuses</SelectItem>
                  <SelectItem value="Unpaid">Unpaid</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={dateFilter}
                onValueChange={(v) => setDateFilter(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Invoices</CardTitle>
            <CardDescription>{filteredInvoices.length} invoice(s) matching criteria</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-slate-200 rounded animate-pulse" />
                ))}
              </div>
            ) : filteredInvoices.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No invoices found matching your filters</p>
                <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                  Create Your First Invoice
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Service / Project</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Info</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => {
                      const computedStatus = getInvoicePaymentStatus(invoice);
                      const latestPayment = (invoice.payments && invoice.payments.length > 0)
                        ? invoice.payments[0]
                        : null;
                      const paymentRecord = latestPayment as unknown as {
                        id: string;
                        payment_date: string;
                        payment_method: string;
                        provider_reference?: string | null;
                        channel?: string | null;
                      } | null;

                      return (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono text-sm font-semibold">
                            <Link
                              to="/invoices/$id"
                              params={{ id: invoice.id }}
                              className="text-primary hover:underline"
                            >
                              {invoice.invoice_number}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">
                              {invoice.clients?.full_name || "-"}
                            </div>
                            {invoice.clients?.email && (
                              <div className="text-xs text-muted-foreground truncate max-w-[140px]">
                                {invoice.clients.email}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[160px]">
                            <div className="truncate text-sm font-medium">
                              {invoice.projects?.services?.name ||
                                invoice.projects?.title ||
                                "Service Request"}
                            </div>
                            {invoice.projects?.project_number && (
                              <div className="font-mono text-[11px] text-muted-foreground">
                                {invoice.projects.project_number}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {formatDate(invoice.issue_date)}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">
                            {invoice.due_date ? formatDate(invoice.due_date) : "—"}
                          </TableCell>
                          <TableCell className="font-semibold text-sm">
                            {formatCurrency(invoice.total)}
                          </TableCell>
                          <TableCell className="text-sm font-medium text-emerald-600">
                            {formatCurrency(invoice.amount_paid)}
                          </TableCell>
                          <TableCell className="text-sm font-medium text-amber-600">
                            {formatCurrency(invoice.balance)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getStatusColor(computedStatus)}>
                              {computedStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {paymentRecord ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                                  <ShieldCheck className="h-3 w-3" />
                                  <span>{formatDate(paymentRecord.payment_date)}</span>
                                </div>
                                {paymentRecord.provider_reference && (
                                  <div className="font-mono text-[10px] text-muted-foreground truncate max-w-[110px]" title={paymentRecord.provider_reference}>
                                    {paymentRecord.provider_reference}
                                  </div>
                                )}
                                {paymentRecord.channel && (
                                  <Badge variant="secondary" className="text-[9px] uppercase px-1 py-0 font-mono">
                                    {paymentRecord.channel}
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link to="/invoices/$id" params={{ id: invoice.id }}>
                                <Button variant="ghost" size="sm" className="h-8 px-2" title="View details">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem asChild>
                                    <Link to="/invoices/$id" params={{ id: invoice.id }}>
                                      <Eye className="mr-2 h-4 w-4" /> View Invoice
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDownloadPdf(invoice)}
                                    disabled={downloadingId === invoice.id}
                                  >
                                    {downloadingId === invoice.id ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <Download className="mr-2 h-4 w-4" />
                                    )}
                                    Download PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleSendReminder(invoice)}
                                    disabled={remindingId === invoice.id}
                                  >
                                    {remindingId === invoice.id ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <Bell className="mr-2 h-4 w-4" />
                                    )}
                                    Send Reminder
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <div className="px-1 py-1">
                                    <ConfirmDialog
                                      trigger={
                                        <button
                                          type="button"
                                          className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10"
                                        >
                                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </button>
                                      }
                                      title="Delete invoice?"
                                      description="This permanently removes the invoice and its line items. Delete its payments first if it has any."
                                      isLoading={deleteInvoice.isPending}
                                      onConfirm={() => deleteInvoice.mutate(invoice.id)}
                                    />
                                  </div>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <InvoiceFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </ProtectedRoute>
  );
}
