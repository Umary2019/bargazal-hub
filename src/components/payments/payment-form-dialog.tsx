import { useState } from "react";
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: clients = [] } = useClients();
  const recordPayment = useRecordPayment();
  const [clientId, setClientId] = useState("");
  const [amount, setAmount] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [method, setMethod] = useState<Database["public"]["Enums"]["payment_method"]>("Cash");
  const { data: invoices = [] } = useInvoices({ clientId: clientId || undefined });
  const selectedInvoice = invoices.find((invoice) => invoice.id === invoiceId);
  const remainingAfterPayment = Math.max(
    Number(selectedInvoice?.balance ?? 0) - (Number(amount) || 0),
    0,
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (
      !clientId ||
      Number(amount) <= 0 ||
      (selectedInvoice && Number(amount) > Number(selectedInvoice.balance))
    )
      return;
    await recordPayment.mutateAsync({
      values: {
        client_id: clientId,
        invoice_id: invoiceId || null,
        amount: Number(amount),
        payment_method: method,
        payment_number: "",
      },
    });
    setClientId("");
    setInvoiceId("");
    setAmount("");
    setMethod("Cash");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>Capture a payment received from a client.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Select
            value={clientId}
            onValueChange={(value) => {
              setClientId(value);
              setInvoiceId("");
            }}
          >
            <SelectTrigger>
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
            <SelectTrigger>
              <SelectValue placeholder="Link to invoice (optional)" />
            </SelectTrigger>
            <SelectContent>
              {invoices.map((invoice) => (
                <SelectItem key={invoice.id} value={invoice.id}>
                  {invoice.invoice_number} - Balance {invoice.balance}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
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
          {selectedInvoice && Number(amount) > Number(selectedInvoice.balance) && (
            <p className="text-sm text-destructive">
              Payment cannot be greater than the invoice balance.
            </p>
          )}
          <Select value={method} onValueChange={(value) => setMethod(value as typeof method)}>
            <SelectTrigger>
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
                Boolean(selectedInvoice && Number(amount) > Number(selectedInvoice.balance))
              }
            >
              {recordPayment.isPending ? "Saving..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
