import { useState, useEffect } from "react";
import { Plus, Trash2, Calendar, DollarSign, Calculator, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { useInvoiceInstallments, useSaveInstallments } from "@/data/invoices";

interface InvoiceInstallmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
}

interface InstallmentItem {
  id?: string;
  installment_number: number;
  amount: number;
  due_date: string;
  notes?: string;
  status: string;
}

export function InvoiceInstallmentsDialog({
  open,
  onOpenChange,
  invoice,
}: InvoiceInstallmentsDialogProps) {
  const { data: existingInstallments = [], isLoading } = useInvoiceInstallments(invoice?.id);
  const saveInstallments = useSaveInstallments();

  const [installments, setInstallments] = useState<InstallmentItem[]>([]);
  const [splitCount, setSplitCount] = useState<number>(2);

  useEffect(() => {
    if (open) {
      if (existingInstallments.length > 0) {
        setInstallments(
          existingInstallments.map((inst: any) => ({
            id: inst.id,
            installment_number: inst.installment_number,
            amount: Number(inst.amount),
            due_date: inst.due_date,
            notes: inst.notes || "",
            status: inst.status,
          }))
        );
      } else {
        // Generate default 2 installments
        generateInstallments(2);
      }
    }
  }, [open, existingInstallments, invoice]);

  function generateInstallments(count: number) {
    if (!invoice) return;
    const total = Number(invoice.total || 0);
    const splitAmount = Math.floor(total / count);
    const remainder = total - splitAmount * count;

    const newItems: InstallmentItem[] = [];
    const baseDate = new Date();

    for (let i = 0; i < count; i++) {
      const dueDate = new Date(baseDate);
      dueDate.setDate(dueDate.getDate() + (i + 1) * 14); // 2 weeks apart

      newItems.push({
        installment_number: i + 1,
        amount: i === count - 1 ? splitAmount + remainder : splitAmount,
        due_date: dueDate.toISOString().slice(0, 10),
        notes: `Installment #${i + 1} of ${count}`,
        status: "pending",
      });
    }
    setInstallments(newItems);
  }

  function handleAddInstallment() {
    const nextNum = installments.length + 1;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + nextNum * 14);

    setInstallments([
      ...installments,
      {
        installment_number: nextNum,
        amount: 0,
        due_date: dueDate.toISOString().slice(0, 10),
        notes: `Installment #${nextNum}`,
        status: "pending",
      },
    ]);
  }

  function handleRemoveInstallment(index: number) {
    const filtered = installments.filter((_, i) => i !== index);
    setInstallments(
      filtered.map((item, idx) => ({
        ...item,
        installment_number: idx + 1,
      }))
    );
  }

  function handleUpdateItem(index: number, field: keyof InstallmentItem, value: any) {
    setInstallments((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  const currentSum = installments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const invoiceTotal = Number(invoice?.total || 0);
  const difference = invoiceTotal - currentSum;
  const isSumValid = Math.abs(difference) < 0.01;

  async function handleSave() {
    if (!isSumValid) {
      toast.error(
        `Installment total (₦${currentSum.toLocaleString()}) must match invoice total (₦${invoiceTotal.toLocaleString()})`
      );
      return;
    }

    try {
      await saveInstallments.mutateAsync({
        invoiceId: invoice.id,
        installments: installments.map((inst) => ({
          installment_number: inst.installment_number,
          amount: Number(inst.amount),
          due_date: inst.due_date,
          notes: inst.notes || undefined,
        })),
      });
      onOpenChange(false);
    } catch {
      // Handled by mutation
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Flexible Payment Installments</DialogTitle>
          <DialogDescription>
            Configure multiple payment installments for Invoice #{invoice?.invoice_number}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Summary Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border bg-muted/30 text-xs">
            <div>
              <span className="text-muted-foreground block">Invoice Total</span>
              <span className="font-bold text-base text-foreground">
                {formatCurrency(invoiceTotal)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Installment Total</span>
              <span
                className={`font-bold text-base ${
                  isSumValid ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {formatCurrency(currentSum)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block">Difference</span>
              <span
                className={`font-semibold ${
                  isSumValid ? "text-emerald-600" : "text-amber-600"
                }`}
              >
                {isSumValid ? "Exact match" : formatCurrency(difference)}
              </span>
            </div>
          </div>

          {/* Quick Auto-Split Controls */}
          <div className="flex items-center gap-2 p-2 bg-muted/15 rounded-md border text-xs">
            <Calculator className="w-4 h-4 text-primary shrink-0" />
            <span className="font-medium text-muted-foreground">Auto Split:</span>
            {[2, 3, 4].map((count) => (
              <Button
                key={count}
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setSplitCount(count);
                  generateInstallments(count);
                }}
              >
                {count} Equal Parts
              </Button>
            ))}
          </div>

          {/* Installments Table */}
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {installments.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg border bg-card text-xs"
              >
                <div className="w-8 font-mono font-bold text-muted-foreground">
                  #{item.installment_number}
                </div>
                <div className="flex-1 min-w-[120px]">
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="Amount"
                    value={item.amount || ""}
                    onChange={(e) => handleUpdateItem(idx, "amount", Number(e.target.value))}
                    className="h-8 text-xs font-semibold"
                  />
                </div>
                <div className="w-36">
                  <Input
                    type="date"
                    value={item.due_date}
                    onChange={(e) => handleUpdateItem(idx, "due_date", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex-1 min-w-[140px]">
                  <Input
                    placeholder="Note / Milestone description"
                    value={item.notes || ""}
                    onChange={(e) => handleUpdateItem(idx, "notes", e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <Badge
                  variant={item.status === "paid" ? "default" : "outline"}
                  className="capitalize text-[10px] h-6"
                >
                  {item.status}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-red-600 hover:bg-red-50"
                  onClick={() => handleRemoveInstallment(idx)}
                  disabled={installments.length <= 1}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddInstallment}
            className="w-full gap-1.5 text-xs"
          >
            <Plus className="w-4 h-4" /> Add Installment
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveInstallments.isPending || !isSumValid}
            className="gap-1.5"
          >
            <Check className="w-4 h-4" />
            {saveInstallments.isPending ? "Saving..." : "Save Installment Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
