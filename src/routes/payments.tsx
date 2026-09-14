import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  CreditCard,
  Download,
  Eye,
  Filter,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  RefreshCcw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/app/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  usePayments,
  usePaystackTransactions,
  useRefunds,
  useProcessRefund,
  useReconcileTransaction,
  useDeletePayment,
} from "@/data/payments";
import { useInvoices } from "@/data/invoices";
import type { Payment } from "@/data/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { PaymentFormDialog } from "@/components/payments/payment-form-dialog";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { PaymentReceipt } from "@/components/payments/payment-receipt";

export const Route = createFileRoute("/payments")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const { data: payments = [], isLoading: paymentsLoading } = usePayments();
  const { data: transactions = [], isLoading: txLoading } = usePaystackTransactions();
  const { data: refunds = [], isLoading: refundsLoading } = useRefunds();
  const { data: invoices = [] } = useInvoices();

  const [activeTab, setActiveTab] = useState<"records" | "gateway" | "refunds" | "reconciliation">("records");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pageSize, setPageSize] = useState(15);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<Payment | undefined>();
  const [receiptInvoice, setReceiptInvoice] = useState<any | null>(null);

  // Refund Modal State
  const [refundTarget, setRefundTarget] = useState<any | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");

  // Reconciliation Modal State
  const [reconcileTarget, setReconcileTarget] = useState<any | null>(null);
  const [reconcileInvoiceId, setReconcileInvoiceId] = useState("");
  const [reconcileNotes, setReconcileNotes] = useState("");

  const deletePayment = useDeletePayment();
  const processRefund = useProcessRefund();
  const reconcileTx = useReconcileTransaction();

  // Metrics
  const totalSettled = useMemo(() => {
    return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [payments]);

  const totalRefunded = useMemo(() => {
    return refunds.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);
  }, [refunds]);

  const onlineSuccessfulCount = useMemo(() => {
    return transactions.filter((t: any) => t.status === "success").length;
  }, [transactions]);

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const q = searchTerm.toLowerCase();
      const numMatch = payment.payment_number.toLowerCase().includes(q);
      const clientMatch = payment.clients?.full_name?.toLowerCase().includes(q) ?? false;
      const refMatch = payment.provider_reference?.toLowerCase().includes(q) ?? false;
      return numMatch || clientMatch || refMatch;
    });
  }, [payments, searchTerm]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx: any) => {
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      const refMatch = (tx.reference || "").toLowerCase().includes(q);
      const emailMatch = (tx.customer_email || "").toLowerCase().includes(q);
      const invMatch = (tx.invoices?.invoice_number || "").toLowerCase().includes(q);
      const clientMatch = (tx.invoices?.clients?.full_name || "").toLowerCase().includes(q);
      return refMatch || emailMatch || invMatch || clientMatch;
    });
  }, [transactions, statusFilter, searchTerm]);

  // Unreconciled / Needs Review Transactions
  const unreconciledTransactions = useMemo(() => {
    return transactions.filter((tx: any) => !tx.invoice_id || tx.status !== "success");
  }, [transactions]);

  // Handlers
  async function handleConfirmRefund(e: React.FormEvent) {
    e.preventDefault();
    if (!refundTarget) return;
    const amt = Number(refundAmount);
    if (!amt || amt <= 0 || amt > Number(refundTarget.amount)) {
      toast.error(`Invalid refund amount. Maximum refundable: ₦${refundTarget.amount}`);
      return;
    }
    if (!refundReason.trim()) {
      toast.error("Please provide a reason for the refund");
      return;
    }

    try {
      await processRefund.mutateAsync({
        paymentId: refundTarget.id,
        amount: amt,
        reason: refundReason.trim(),
        transactionReference: refundTarget.provider_reference || undefined,
      });
      setRefundTarget(null);
      setRefundAmount("");
      setRefundReason("");
    } catch {
      // Error handled by mutation
    }
  }

  async function handleConfirmReconcile(e: React.FormEvent) {
    e.preventDefault();
    if (!reconcileTarget || !reconcileInvoiceId) {
      toast.error("Select an invoice to reconcile with");
      return;
    }

    try {
      await reconcileTx.mutateAsync({
        transactionId: reconcileTarget.id,
        invoiceId: reconcileInvoiceId,
        ...(reconcileNotes.trim() ? { notes: reconcileNotes.trim() } : {}),
      });
      setReconcileTarget(null);
      setReconcileInvoiceId("");
      setReconcileNotes("");
    } catch {
      // Error handled by mutation
    }
  }

  return (
    <ProtectedRoute roles={["admin", "staff"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payment Center</h1>
            <p className="text-muted-foreground">
              Manage transactions, Paystack gateway settlements, refunds, and reconciliation.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="gap-2"
              onClick={() => {
                setSelectedPayment(undefined);
                setDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Record Manual Payment
            </Button>
          </div>
        </div>

        {/* Stats KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Settled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalSettled)}</div>
              <p className="text-xs text-muted-foreground">{payments.length} successful payment(s)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Refunded</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(totalRefunded)}</div>
              <p className="text-xs text-muted-foreground">{refunds.length} processed refund(s)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Online Gateway Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{onlineSuccessfulCount}</div>
              <p className="text-xs text-muted-foreground">Via Paystack Checkout</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Unreconciled / Incomplete</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{unreconciledTransactions.length}</div>
              <p className="text-xs text-muted-foreground">Pending or unlinked items</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-2 sm:col-span-2">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  placeholder="Search by reference, payment #, invoice, or client..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {activeTab === "gateway" && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Gateway status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="abandoned">Abandoned</SelectItem>
                    <SelectItem value="reversed">Reversed</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 max-w-2xl">
            <TabsTrigger value="records" className="text-xs sm:text-sm">
              Payments ({payments.length})
            </TabsTrigger>
            <TabsTrigger value="gateway" className="text-xs sm:text-sm">
              Gateway Transactions ({transactions.length})
            </TabsTrigger>
            <TabsTrigger value="refunds" className="text-xs sm:text-sm">
              Refunds ({refunds.length})
            </TabsTrigger>
            <TabsTrigger value="reconciliation" className="text-xs sm:text-sm">
              Reconciliation ({unreconciledTransactions.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PAYMENTS */}
          <TabsContent value="records">
            <Card>
              <CardHeader>
                <CardTitle>Settled Payment Records</CardTitle>
                <CardDescription>All confirmed client payments recorded in the database.</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Loading payments...</div>
                ) : filteredPayments.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">No payment records found.</div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Payment #</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-mono font-medium">{payment.payment_number}</TableCell>
                            <TableCell>{payment.clients?.full_name ?? "—"}</TableCell>
                            <TableCell>
                              {payment.invoices ? (
                                <Link
                                  to="/invoices/$id"
                                  params={{ id: payment.invoices.id }}
                                  className="text-primary hover:underline font-mono text-xs"
                                >
                                  {payment.invoices.invoice_number}
                                </Link>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="font-bold text-emerald-600">
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {payment.payment_method}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(payment.payment_date)}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[130px]">
                              {payment.provider_reference || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    setRefundTarget(payment);
                                    setRefundAmount(String(payment.amount));
                                  }}
                                  title="Process Refund"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" /> Refund
                                </Button>
                                <ConfirmDialog
                                  trigger={
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  }
                                  title="Delete payment record?"
                                  description="This will remove the payment and recalculate the linked invoice balance."
                                  onConfirm={() => deletePayment.mutate(payment.id)}
                                />
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

          {/* TAB 2: PAYSTACK GATEWAY TRANSACTIONS */}
          <TabsContent value="gateway">
            <Card>
              <CardHeader>
                <CardTitle>Paystack Gateway Transactions</CardTitle>
                <CardDescription>Live payment sessions, authorization attempts, and webhook records.</CardDescription>
              </CardHeader>
              <CardContent>
                {txLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Loading gateway logs...</div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">No gateway transactions matching criteria.</div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reference</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Channel</TableHead>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Timestamp</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTransactions.map((tx: any) => {
                          const isSuccess = tx.status === "success";
                          const isFailed = tx.status === "failed";
                          return (
                            <TableRow key={tx.id}>
                              <TableCell className="font-mono font-medium text-xs">{tx.reference}</TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    isSuccess
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                      : isFailed
                                        ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                  }
                                >
                                  {tx.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs">{tx.customer_email || "—"}</TableCell>
                              <TableCell className="font-semibold text-foreground">
                                {formatCurrency(Number(tx.amount_kobo || 0) / 100)}
                              </TableCell>
                              <TableCell className="capitalize text-xs">{tx.channel || "card"}</TableCell>
                              <TableCell>
                                {tx.invoices ? (
                                  <Link
                                    to="/invoices/$id"
                                    params={{ id: tx.invoices.id }}
                                    className="text-primary hover:underline font-mono text-xs"
                                  >
                                    {tx.invoices.invoice_number}
                                  </Link>
                                ) : (
                                  <span className="text-muted-foreground italic text-xs">Unlinked</span>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground font-mono">
                                {formatDateTime(tx.created_at)}
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
          </TabsContent>

          {/* TAB 3: REFUNDS */}
          <TabsContent value="refunds">
            <Card>
              <CardHeader>
                <CardTitle>Processed Refunds</CardTitle>
                <CardDescription>Audit trail of all partial and full payment refunds.</CardDescription>
              </CardHeader>
              <CardContent>
                {refundsLoading ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">Loading refund records...</div>
                ) : refunds.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">No refunds processed yet.</div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Client</TableHead>
                          <TableHead>Refund Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Gateway ID</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {refunds.map((ref: any) => (
                          <TableRow key={ref.id}>
                            <TableCell className="text-xs font-mono">{formatDate(ref.created_at)}</TableCell>
                            <TableCell className="font-mono text-xs">
                              {ref.invoices?.invoice_number || "—"}
                            </TableCell>
                            <TableCell>{ref.invoices?.clients?.full_name || "—"}</TableCell>
                            <TableCell className="font-bold text-red-600">
                              {formatCurrency(ref.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-emerald-100 text-emerald-800">{ref.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate" title={ref.reason}>
                              {ref.reason}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {ref.gateway_refund_id || "Direct RPC"}
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

          {/* TAB 4: RECONCILIATION */}
          <TabsContent value="reconciliation">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Reconciliation Center</CardTitle>
                <CardDescription>
                  Manually link orphaned gateway payments or resolve reference discrepancies with customer invoices.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {unreconciledTransactions.length === 0 ? (
                  <div className="py-8 text-center border rounded-lg bg-emerald-50/20 text-emerald-900 dark:text-emerald-300">
                    <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600 mb-1" />
                    <p className="text-sm font-semibold">All transactions reconciled</p>
                    <p className="text-xs text-muted-foreground">No unlinked or orphaned gateway records requiring attention.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Reference</TableHead>
                          <TableHead>Gateway Status</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Timestamp</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unreconciledTransactions.map((tx: any) => (
                          <TableRow key={tx.id}>
                            <TableCell className="font-mono text-xs font-semibold">{tx.reference}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{tx.status}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">{tx.customer_email || "—"}</TableCell>
                            <TableCell className="font-semibold text-foreground">
                              {formatCurrency(Number(tx.amount_kobo || 0) / 100)}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">
                              {formatDate(tx.created_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs gap-1 border-blue-400 text-blue-700 hover:bg-blue-50"
                                onClick={() => {
                                  setReconcileTarget(tx);
                                  setReconcileInvoiceId("");
                                  setReconcileNotes("");
                                }}
                              >
                                <RefreshCcw className="h-3.5 w-3.5" /> Reconcile
                              </Button>
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
        </Tabs>
      </div>

      {/* Record Manual Payment Dialog */}
      <PaymentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        payment={selectedPayment}
      />

      {/* REFUND DIALOG */}
      <Dialog open={Boolean(refundTarget)} onOpenChange={(open) => !open && setRefundTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Process Payment Refund</DialogTitle>
            <DialogDescription>
              Refund payment #{refundTarget?.payment_number}. The linked invoice balance will automatically be recalculated.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmRefund} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Original Payment Amount</label>
              <Input disabled value={refundTarget ? formatCurrency(refundTarget.amount) : ""} />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Refund Amount (NGN) *</label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                max={refundTarget?.amount}
                required
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Reason for Refund *</label>
              <Textarea
                rows={3}
                placeholder="State client requested refund, duplicate charge, scope adjustment, etc."
                required
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRefundTarget(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={processRefund.isPending}
              >
                {processRefund.isPending ? "Processing..." : "Confirm & Issue Refund"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* RECONCILIATION DIALOG */}
      <Dialog open={Boolean(reconcileTarget)} onOpenChange={(open) => !open && setReconcileTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reconcile Transaction</DialogTitle>
            <DialogDescription>
              Link transaction {reconcileTarget?.reference} to an unpaid or partially paid invoice.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmReconcile} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Transaction Details</label>
              <div className="rounded-lg border p-3 bg-muted/20 text-xs space-y-1">
                <p><span className="font-semibold">Reference:</span> {reconcileTarget?.reference}</p>
                <p><span className="font-semibold">Customer:</span> {reconcileTarget?.customer_email}</p>
                <p><span className="font-semibold">Amount:</span> {formatCurrency(Number(reconcileTarget?.amount_kobo || 0) / 100)}</p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Select Target Invoice *</label>
              <Select value={reconcileInvoiceId} onValueChange={setReconcileInvoiceId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an invoice" />
                </SelectTrigger>
                <SelectContent>
                  {invoices
                    .filter((i) => i.status !== "Cancelled" && i.status !== "Paid")
                    .map((inv) => (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoice_number} — {inv.clients?.full_name} (Due: {formatCurrency(inv.balance ?? inv.total)})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Reconciliation Audit Notes</label>
              <Textarea
                rows={2}
                placeholder="Explain the reason for manual link..."
                value={reconcileNotes}
                onChange={(e) => setReconcileNotes(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReconcileTarget(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={reconcileTx.isPending || !reconcileInvoiceId}
              >
                {reconcileTx.isPending ? "Reconciling..." : "Complete Reconciliation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
