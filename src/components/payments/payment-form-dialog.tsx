import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useClients } from "@/data/clients";
import { useInvoices } from "@/data/invoices";
import { useRecordPayment } from "@/data/payments";
import { useProjects } from "@/data/projects";
import type { Payment } from "@/data/types";
import type { Database } from "@/integrations/supabase/types";

const methods: Database["public"]["Enums"]["payment_method"][] = [
  "Cash",
  "Bank Transfer",
  "POS",
  "Online Payment",
  "Other",
];

export function PaymentFormDialog({
  open,
  onOpenChange,
  onFullPayment,
  payment,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFullPayment?: (invoiceId: string) => void;
  payment?: Payment | undefined;
}) {
  const { data: clients = [] } = useClients();
  const recordPayment = useRecordPayment();
  const [clientId, setClientId] = useState("");
  const [amount, setAmount] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [method, setMethod] = useState<Database["public"]["Enums"]["payment_method"]>("Cash");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState("");
  const [projectId, setProjectId] = useState("");
  const { data: projects = [] } = useProjects({ clientId: clientId || undefined });
  const { data: invoices = [] } = useInvoices({ clientId: clientId || undefined });
  const selectedInvoice = invoices.find((invoice) => invoice.id === invoiceId);
  const isEditing = Boolean(payment);
  const availableBalance = Number(selectedInvoice?.balance ?? 0) + (payment?.invoice_id === invoiceId ? Number(payment.amount) : 0);
  const remainingAfterPayment = Math.max(
    availableBalance - (Number(amount) || 0),
    0,
  );

  useEffect(() => {
    if (!open) return;
    setClientId(payment?.client_id ?? "");
    setInvoiceId(payment?.invoice_id ?? "");
    setProjectId(payment?.project_id ?? "");
    setAmount(payment ? String(payment.amount) : "");
    setMethod(payment?.payment_method ?? "Cash");
    setPaymentDate(payment?.payment_date ?? new Date().toISOString().slice(0, 10));
    setReference(payment?.reference ?? "");
  }, [open, payment]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (
      !clientId ||
      !invoiceId ||
      Number(amount) <= 0 ||
      (selectedInvoice && Number(amount) > availableBalance)
    )
      return;
    await recordPayment.mutateAsync({
      values: {
        client_id: clientId,
        invoice_id: invoiceId || null,
        project_id: projectId || selectedInvoice?.project_id || null,
        amount: Number(amount),
        payment_method: method,
        payment_date: paymentDate,
        reference: reference.trim() || null,
        payment_number: "",
      },
    });
    const completedInvoiceId =
      selectedInvoice && remainingAfterPayment === 0 ? selectedInvoice.id : null;
    setClientId("");
    setInvoiceId("");
    setAmount("");
    setMethod("Cash");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setReference("");
    setProjectId("");
    onOpenChange(false);
    if (completedInvoiceId) onFullPayment?.(completedInvoiceId);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Payment" : "Record Payment"}</DialogTitle>
          <DialogDescription>Deposits and final payments are recorded as linked payment records.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Select
            value={clientId}
            onValueChange={(value) => {
              setClientId(value);
              setInvoiceId("");
            }}
          >
            <SelectTrigger aria-label="Client">
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={invoiceId} onValueChange={setInvoiceId}>
            <SelectTrigger aria-label="Invoice">
              <SelectValue placeholder="Select invoice (required)" />
            </SelectTrigger>
            <SelectContent>
              {invoices.map((invoice) => (
                <SelectItem key={invoice.id} value={invoice.id}>
                  {invoice.invoice_number} - Balance {invoice.balance}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger aria-label="Project"><SelectValue placeholder="Project is linked from invoice" /></SelectTrigger>
            <SelectContent>{projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.project_number} - {project.title}</SelectItem>)}</SelectContent>
          </Select>
          <Input
            aria-label="Payment amount"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              aria-label="Payment date"
              type="date"
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
              required
            />
            <Input
              aria-label="Payment reference"
              placeholder="Bank or receipt reference (optional)"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
            />
          </div>
          {selectedInvoice && (
            <div className="grid gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-2">
              <div>
                <div className="text-xs text-muted-foreground">Invoice total</div>
                <div className="font-semibold">
                  ₦{Number(selectedInvoice.total).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Balance after payment</div>
                <div className="font-semibold">₦{remainingAfterPayment.toLocaleString()}</div>
              </div>
            </div>
          )}
          {selectedInvoice && Number(amount) > availableBalance && (
            <p className="text-sm text-destructive">
              Payment cannot be greater than the invoice balance.
            </p>
          )}
          <Select value={method} onValueChange={(value) => setMethod(value as typeof method)}>
            <SelectTrigger aria-label="Payment method">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {methods.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              type="submit"
              disabled={
                recordPayment.isPending ||
                !clientId ||
                !invoiceId ||
                Boolean(selectedInvoice && Number(amount) > availableBalance)
              }
            >
              {recordPayment.isPending ? "Saving..." : isEditing ? "Save Payment" : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
