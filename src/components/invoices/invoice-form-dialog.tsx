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
import { useProjects } from "@/data/projects";
import { useSaveInvoice } from "@/data/invoices";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  const [projectId, setProjectId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const { data: projects = [] } = useProjects({ clientId: clientId || undefined });

  useEffect(() => {
    if (!open) return;
    const firstItem = invoice?.invoice_items[0];
    setClientId(invoice?.client_id ?? "");
    setDescription(firstItem?.description ?? "");
    setAmount(firstItem ? String(firstItem.unit_price) : "");
    setProjectId(invoice?.project_id ?? "");
    setDueDate(invoice?.due_date ?? "");
  }, [open, invoice]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const total = Number(amount);
    if (!clientId || !description.trim() || total <= 0) return;
    const status: Database["public"]["Enums"]["invoice_status"] = invoice?.status ?? "Draft";

    let targetInvoiceId = invoice?.id;
    if (!targetInvoiceId && projectId) {
      const { data: existingProjectInv } = await supabase
        .from("invoices")
        .select("id, invoice_number")
        .eq("project_id", projectId)
        .neq("status", "Cancelled")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingProjectInv) {
        targetInvoiceId = existingProjectInv.id;
        toast.info(
          `Updating existing active invoice (${existingProjectInv.invoice_number}) for this project.`,
        );
      }
    }

    await saveInvoice.mutateAsync({
      id: targetInvoiceId,
      values: {
        client_id: clientId,
        project_id: projectId || null,
        issue_date: invoice?.issue_date ?? new Date().toISOString().slice(0, 10),
        due_date: dueDate || null,
        status,
        discount: invoice?.discount ?? 0,
        tax: invoice?.tax ?? 0,
        notes: invoice?.notes,
        items: [{ description: description.trim(), quantity: 1, unit_price: Number(amount) }],
      },
    });
    setClientId("");
    setDescription("");
    setAmount("");
    setProjectId("");
    setDueDate("");
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
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger aria-label="Project">
              <SelectValue placeholder="Link to project (optional)" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.project_number} - {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            aria-label="Due date"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
          <Input
            aria-label="Item description"
            placeholder="Item description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
          />
          <Input
            aria-label="Amount"
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
              <div className="text-xs text-muted-foreground">Remaining balance</div>
              <div className="mt-1 font-semibold">₦{Number(amount || 0).toLocaleString()}</div>
            </div>
          </div>

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
