import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClients } from "@/data/clients";
import { useRecordPayment } from "@/data/payments";
import type { Database } from "@/integrations/supabase/types";

const methods: Database["public"]["Enums"]["payment_method"][] = ["Cash", "Bank Transfer", "POS", "Online Payment", "Other"];

export function PaymentFormDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: clients = [] } = useClients();
  const recordPayment = useRecordPayment();
  const [clientId, setClientId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Database["public"]["Enums"]["payment_method"]>("Cash");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!clientId || Number(amount) <= 0) return;
    await recordPayment.mutateAsync({ values: { client_id: clientId, amount: Number(amount), payment_method: method, payment_number: "" } });
    setClientId(""); setAmount(""); setMethod("Cash"); onOpenChange(false);
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Record Payment</DialogTitle><DialogDescription>Capture a payment received from a client.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4"><Select value={clientId} onValueChange={setClientId}><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.full_name}</SelectItem>)}</SelectContent></Select><Input type="number" min="0.01" step="0.01" placeholder="Amount" value={amount} onChange={(event) => setAmount(event.target.value)} required /><Select value={method} onValueChange={(value) => setMethod(value as typeof method)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{methods.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select><DialogFooter><Button type="submit" disabled={recordPayment.isPending || !clientId}>{recordPayment.isPending ? "Saving..." : "Record Payment"}</Button></DialogFooter></form></DialogContent></Dialog>;
}
