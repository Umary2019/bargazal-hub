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

  useEffect(() => {
    if (!open) return;
    const firstItem = invoice?.invoice_items[0];
    setClientId(invoice?.client_id ?? "");
    setDescription(firstItem?.description ?? "");
    setAmount(firstItem ? String(firstItem.unit_price) : "");
  }, [open, invoice]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!clientId || !description.trim() || Number(amount) <= 0) return;
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
        notes: invoice?.notes,
        items: [{ description: description.trim(), quantity: 1, unit_price: Number(amount) }],
      },
    });
    setClientId("");
    setDescription("");
    setAmount("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
