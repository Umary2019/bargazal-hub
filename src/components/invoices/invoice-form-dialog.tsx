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
import { useSaveInvoice } from "@/data/invoices";
import type { Database } from "@/integrations/supabase/types";
import type { InvoiceItem, InvoiceWithRelations } from "@/data/types";

export function InvoiceFormDialog({
  open,
  onOpenChange,
  invoice,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice?: InvoiceWithRelations & { invoice_items: InvoiceItem[] };
}) {
  const { data: clients = [] } = useClients();
  const saveInvoice = useSaveInvoice();
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [amountPaid, setAmountPaid] = useState("0");

  useEffect(() => {
    if (!open) return;
    const firstItem = invoice?.invoice_items[0];
    setClientId(invoice?.client_id ?? "");
    setDescription(firstItem?.description ?? "");
    setAmount(firstItem ? String(firstItem.unit_price) : "");
    setAmountPaid(invoice ? String(invoice.amount_paid ?? 0) : "0");
  }, [open, invoice]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const total = Number(amount);
    const paid = Number(amountPaid) || 0;
    if (!clientId || !description.trim() || total <= 0 || paid < 0 || paid > total) return;
    await saveInvoice.mutateAsync({
      id: invoice?.id,
      values: {
        client_id: clientId,
        project_id: invoice?.project_id,
        issue_date: invoice?.issue_date ?? new Date().toISOString().slice(0, 10),
        due_date: invoice?.due_date,
        status: invoice?.status ?? ("Draft" as Database["public"]["Enums"]["invoice_status"]),
        discount: invoice?.discount ?? 0,
        tax: invoice?.tax ?? 0,
        amount_paid: paid,
        notes: invoice?.notes,
        items: [{ description: description.trim(), quantity: 1, unit_price: Number(amount) }],
      },
    });
    setClientId("");
    setDescription("");
    setAmount("");
    setAmountPaid("0");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{invoice ? "Edit Invoice" : "New Invoice"}</DialogTitle>
          <DialogDescription>
            {invoice
              ? "Update invoice details and its first line item."
              : "Create a draft invoice with its first line item."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Select value={clientId} onValueChange={setClientId}>
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
          <Input
            placeholder="Item description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
          />
          <Input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Amount"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Total amount</div>
              <div className="mt-1 font-semibold">₦{Number(amount || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Amount paid</div>
              <Input
                className="mt-1 h-8 bg-background"
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={(event) => setAmountPaid(event.target.value)}
                aria-label="Amount paid"
              />
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Remaining balance</div>
              <div className="mt-1 font-semibold">
                ₦{Math.max(Number(amount || 0) - (Number(amountPaid) || 0), 0).toLocaleString()}
              </div>
            </div>
          </div>
          {Number(amountPaid) > Number(amount) && (
            <p className="text-sm text-destructive">
              Amount paid cannot be greater than the total amount.
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={saveInvoice.isPending || !clientId}>
              {saveInvoice.isPending ? "Saving..." : invoice ? "Save Changes" : "Create Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
