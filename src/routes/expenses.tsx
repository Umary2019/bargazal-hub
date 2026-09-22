import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  FileText,
  Paperclip,
  Eye,
  DollarSign,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useExpenses,
  useDeleteExpense,
  useApproveExpense,
  useRejectExpense,
} from "@/data/expenses";
import { formatCurrency, formatDate } from "@/lib/format";
import { format } from "date-fns";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { useAuth } from "@/hooks/useAuth";
import { exportToCsv } from "@/lib/csv";
import type { Expense } from "@/data/types";

export const Route = createFileRoute("/expenses")({
  component: ExpensesPage,
});

const EXPENSE_CATEGORIES = [
  "Internet",
  "Hosting",
  "Domain",
  "Transportation",
  "Equipment",
  "Software",
  "Marketing",
  "Office",
  "Utilities",
  "Maintenance",
  "Other",
];

function ExpensesPage() {
  const { data: expenses = [], isLoading } = useExpenses();
  const { isAdmin } = useAuth();
  const deleteExpense = useDeleteExpense();
  const approveExpense = useApproveExpense();
  const rejectExpense = useRejectExpense();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [approvalFilter, setApprovalFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Reject dialog state
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const openCreate = () => {
    setSelectedExpense(null);
    setDialogOpen(true);
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense: any) => {
      // Search
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        expense.description.toLowerCase().includes(q) ||
        (expense.vendor?.toLowerCase().includes(q) ?? false) ||
        (expense.expense_number?.toLowerCase().includes(q) ?? false);

      // Category
      const matchesCategory = !categoryFilter || expense.category === categoryFilter;

      // Approval filter
      const status = expense.approval_status || "approved";
      const matchesApproval = approvalFilter === "all" || status === approvalFilter;

      return matchesSearch && matchesCategory && matchesApproval;
    });
  }, [expenses, searchTerm, categoryFilter, approvalFilter]);

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const pendingCount = expenses.filter(
    (e: any) => (e.approval_status || "approved") === "pending",
  ).length;

  // Export to CSV
  function handleExportCsv() {
    if (filteredExpenses.length === 0) {
      toast.error("No expenses to export");
      return;
    }
    const headers = [
      "Expense Number",
      "Category",
      "Description",
      "Amount (NGN)",
      "Vendor",
      "Date",
      "Approval Status",
      "Approved Date",
    ];
    const rows = filteredExpenses.map((e: any) => [
      e.expense_number,
      e.category,
      e.description,
      e.amount,
      e.vendor || "",
      e.expense_date,
      e.approval_status || "approved",
      e.approved_at ? new Date(e.approved_at).toLocaleDateString() : "",
    ]);
    exportToCsv(`bargazal-expenses-${new Date().toISOString().slice(0, 10)}`, headers, rows);
    toast.success(`Exported ${filteredExpenses.length} expenses to CSV`);
  }

  async function handleConfirmReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectId || !rejectionReason.trim()) return;
    try {
      await rejectExpense.mutateAsync({ id: rejectId, reason: rejectionReason.trim() });
      setRejectId(null);
      setRejectionReason("");
    } catch {
      // Handled by mutation
    }
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Expenses & Disbursals</h1>
            <p className="text-muted-foreground">
              Record business operating expenses, upload receipts, and manage approvals.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button className="gap-2" size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              Record Expense
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Recorded Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalExpenses)}</div>
              <p className="text-xs text-muted-foreground">{expenses.length} expense(s)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Awaiting Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
              <p className="text-xs text-muted-foreground">Pending administrative sign-off</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approved Disbursals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {
                  expenses.filter((e: any) => (e.approval_status || "approved") === "approved")
                    .length
                }
              </div>
              <p className="text-xs text-muted-foreground">Active business deductions</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by description, vendor, or expense number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <Select
                  value={categoryFilter || "all"}
                  onValueChange={(v) => setCategoryFilter(v === "all" ? null : v)}
                >
                  <SelectTrigger className="w-40 h-9 text-xs">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={approvalFilter} onValueChange={setApprovalFilter}>
                  <SelectTrigger className="w-36 h-9 text-xs">
                    <SelectValue placeholder="Approval Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Table */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Register</CardTitle>
            <CardDescription>{filteredExpenses.length} expense(s) matching filter</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-slate-200 rounded animate-pulse" />
                ))}
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No expenses found</p>
                <Button variant="outline" className="mt-4" onClick={openCreate}>
                  Record Your First Expense
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((expense: any) => {
                      const approvalStatus = expense.approval_status || "approved";
                      return (
                        <TableRow key={expense.id}>
                          <TableCell className="font-mono text-xs font-semibold">
                            {expense.expense_number}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{expense.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <span>{expense.description}</span>
                              {expense.rejection_reason && (
                                <p className="text-[11px] text-red-600 mt-0.5">
                                  Reason: {expense.rejection_reason}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-foreground">
                            {formatCurrency(expense.amount)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {expense.vendor || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(expense.expense_date), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell>
                            {approvalStatus === "approved" ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                                Approved
                              </Badge>
                            ) : approvalStatus === "rejected" ? (
                              <Badge variant="destructive">Rejected</Badge>
                            ) : (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                Pending Review
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end items-center gap-1">
                              {isAdmin && approvalStatus === "pending" && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => approveExpense.mutate(expense.id)}
                                    title="Approve Expense"
                                    className="text-emerald-600 hover:bg-emerald-50 h-8 px-2"
                                  >
                                    <CheckCircle2 className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setRejectId(expense.id)}
                                    title="Reject Expense"
                                    className="text-red-600 hover:bg-red-50 h-8 px-2"
                                  >
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedExpense(expense);
                                  setDialogOpen(true);
                                }}
                              >
                                Edit
                              </Button>
                              <ConfirmDialog
                                trigger={
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                }
                                title="Delete expense?"
                                description="This permanently removes the expense record."
                                confirmLabel="Delete"
                                onConfirm={() => deleteExpense.mutate(expense.id)}
                              />
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

      <ExpenseFormDialog open={dialogOpen} onOpenChange={setDialogOpen} expense={selectedExpense} />

      {/* Reject Expense Dialog */}
      <Dialog open={Boolean(rejectId)} onOpenChange={(open) => !open && setRejectId(null)}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleConfirmReject}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" /> Reject Expense
              </DialogTitle>
              <DialogDescription>
                Provide feedback to the staff member explaining why this expense was declined.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-2">
              <label className="text-xs font-medium text-muted-foreground block">
                Rejection Reason *
              </label>
              <Textarea
                rows={3}
                placeholder="e.g. Missing valid receipt / Out-of-policy personal expense"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRejectId(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={rejectExpense.isPending || !rejectionReason.trim()}
              >
                {rejectExpense.isPending ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
