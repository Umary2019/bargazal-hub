import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/app/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClients } from "@/data/clients";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/quotes")({ component: QuotesPage });

type Quote = { id: string; quote_number: string; client_id: string; total: number; status: string; expiry_date: string | null };

function QuotesPage() {
  const queryClient = useQueryClient();
  const { data: clients = [] } = useClients();
  const [clientId, setClientId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const quotesQuery = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotes" as never).select("*, clients(id, full_name)").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Quote[];
    },
  });
  const createQuote = useMutation({
    mutationFn: async () => {
      const quoteResult = await supabase.from("quotes" as never).insert({ client_id: clientId, expiry_date: expiryDate || null, status: "Draft", quote_number: "", subtotal: Number(amount), discount: 0, tax: 0, total: Number(amount) } as never).select().single();
      if (quoteResult.error) throw quoteResult.error;
      const quote = quoteResult.data as unknown as { id: string };
      const { error } = await supabase.from("quote_items" as never).insert({ quote_id: quote.id, description: description.trim(), quantity: 1, unit_price: Number(amount) } as never);
      if (error) throw error;
    },
    onSuccess: () => { setClientId(""); setDescription(""); setAmount(""); setExpiryDate(""); void queryClient.invalidateQueries({ queryKey: ["quotes"] }); toast.success("Quote created"); },
    onError: () => toast.error("Could not create quote"),
  });
  const canCreate = Boolean(clientId && description.trim() && Number(amount) > 0);

  return <ProtectedRoute><div className="space-y-6">
    <div className="flex items-center justify-between"><div><h1 className="text-3xl font-bold tracking-tight">Quotations</h1><p className="text-muted-foreground">Prepare, track, and convert client quotations.</p></div></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4" />New quotation</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Select value={clientId} onValueChange={setClientId}><SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger><SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.full_name}</SelectItem>)}</SelectContent></Select>
      <Input placeholder="Description" value={description} onChange={(event) => setDescription(event.target.value)} />
      <Input type="number" min="0.01" step="0.01" placeholder="Amount" value={amount} onChange={(event) => setAmount(event.target.value)} />
      <Input type="date" aria-label="Quote expiry date" value={expiryDate} onChange={(event) => setExpiryDate(event.target.value)} />
      <Button disabled={!canCreate || createQuote.isPending} onClick={() => createQuote.mutate()}>Create quote</Button>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Quote register</CardTitle></CardHeader><CardContent className="space-y-2">{quotesQuery.data?.length ? quotesQuery.data.map((quote) => <div key={quote.id} className="flex flex-wrap items-center gap-3 rounded-md border p-3"><FileText className="h-4 w-4" /><span className="font-medium">{quote.quote_number}</span><span className="flex-1">{formatCurrency(quote.total)}</span><span>{quote.status}</span><span className="text-sm text-muted-foreground">{quote.expiry_date ? `Expires ${formatDate(quote.expiry_date)}` : "No expiry"}</span></div>) : <p className="py-8 text-center text-muted-foreground">No quotations yet.</p>}</CardContent></Card>
  </div></ProtectedRoute>;
}
