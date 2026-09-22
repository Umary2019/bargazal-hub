import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  FileText,
  Plus,
  Trash2,
  Printer,
  ArrowRight,
  Calculator,
  Percent,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ProtectedRoute } from "@/components/app/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClients } from "@/data/clients";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/quotes")({ component: QuotesPage });

interface QuoteItemInput {
  description: string;
  quantity: number;
  unit_price: number;
}

interface Quote {
  id: string;
  quote_number: string;
  client_id: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: string;
  expiry_date: string | null;
  created_at: string;
  clients?: { id: string; full_name: string } | null;
}

function QuotesPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: clients = [] } = useClients();

  // Quote form state
  const [clientId, setClientId] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [discountPct, setDiscountPct] = useState<number>(0);
  const [taxPct, setTaxPct] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<QuoteItemInput[]>([
    { description: "", quantity: 1, unit_price: 0 },
  ]);

  // Calculations
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0),
    0,
  );
  const discountAmount = Math.round((subtotal * (Number(discountPct) || 0)) / 100);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round((taxableAmount * (Number(taxPct) || 0)) / 100);
  const grandTotal = taxableAmount + taxAmount;

  // Quotes Query
  const quotesQuery = useQuery({
    queryKey: ["quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes" as never)
        .select("*, clients(id, full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Quote[];
    },
  });

  // Create Quote Mutation
  const createQuote = useMutation({
    mutationFn: async () => {
      const validItems = items.filter((i) => i.description.trim() && Number(i.unit_price) > 0);
      if (validItems.length === 0) throw new Error("At least one valid line item is required");

      const quoteResult = await supabase
        .from("quotes" as never)
        .insert({
          client_id: clientId,
          expiry_date: expiryDate || null,
          status: "Draft",
          quote_number: "",
          subtotal,
          discount: discountAmount,
          tax: taxAmount,
          total: grandTotal,
          notes: notes.trim() || null,
        } as never)
        .select()
        .single();
      if (quoteResult.error) throw quoteResult.error;
      const quote = quoteResult.data as unknown as { id: string };

      const itemInserts = validItems.map((item) => ({
        quote_id: quote.id,
        description: item.description.trim(),
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
      }));

      const { error: itemsError } = await supabase
        .from("quote_items" as never)
        .insert(itemInserts as never);
      if (itemsError) throw itemsError;
    },
    onSuccess: () => {
      setClientId("");
      setExpiryDate("");
      setDiscountPct(0);
      setTaxPct(0);
      setNotes("");
      setItems([{ description: "", quantity: 1, unit_price: 0 }]);
      void queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Quote generated successfully");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not create quote"),
  });

  // Update Status Mutation
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("quotes" as never)
        .update({ status } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Quote status updated");
    },
  });

  // Convert Quote Mutation
  const convertQuote = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.rpc(
        "convert_quote_to_invoice" as never,
        { _quote_id: id } as never,
      );
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: (invoiceId) => {
      void queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Quote converted to official invoice");
      navigate({ to: "/invoices/$id", params: { id: invoiceId } });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not convert quote"),
  });

  // Line item helpers
  function handleAddItem() {
    setItems([...items, { description: "", quantity: 1, unit_price: 0 }]);
  }

  function handleRemoveItem(idx: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  }

  function handleUpdateItem(idx: number, field: keyof QuoteItemInput, val: any) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: val } : it)));
  }

  const canCreate = Boolean(
    clientId && items.some((i) => i.description.trim() && Number(i.unit_price) > 0),
  );

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quotations & Proposals</h1>
            <p className="text-muted-foreground">
              Prepare multi-item quotes with discount and tax, send to clients, and convert to
              invoices.
            </p>
          </div>
        </div>

        {/* Create Quotation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" /> New Quotation
            </CardTitle>
            <CardDescription>
              Specify client, multiple service items, discounts, and expiration date.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Top row: Client & Expiry */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Client *
                </label>
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
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Expiry Date
                </label>
                <Input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
            </div>

            {/* Line items */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground block">
                Quote Line Items *
              </label>
              <div className="space-y-2">
                {items.map((item, idx) => {
                  const lineTotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
                  return (
                    <div
                      key={idx}
                      className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg border bg-muted/20"
                    >
                      <div className="flex-1 min-w-[200px]">
                        <Input
                          placeholder="Service / Deliverable description..."
                          value={item.description}
                          onChange={(e) => handleUpdateItem(idx, "description", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.quantity || ""}
                          onChange={(e) =>
                            handleUpdateItem(idx, "quantity", Number(e.target.value))
                          }
                          className="h-8 text-xs text-center"
                        />
                      </div>
                      <div className="w-28">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Unit Price"
                          value={item.unit_price || ""}
                          onChange={(e) =>
                            handleUpdateItem(idx, "unit_price", Number(e.target.value))
                          }
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="w-24 text-right font-mono font-semibold text-xs text-foreground">
                        {formatCurrency(lineTotal)}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:bg-red-50"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="gap-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Line Item
              </Button>
            </div>

            {/* Pricing Summary & Adjustments */}
            <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Discount (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={discountPct || ""}
                      onChange={(e) => setDiscountPct(Number(e.target.value))}
                      placeholder="0"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Tax / VAT (%)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={taxPct || ""}
                      onChange={(e) => setTaxPct(Number(e.target.value))}
                      placeholder="0"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Terms & Notes
                  </label>
                  <Input
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Valid for 30 days. 50% deposit required on kickoff."
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Totals Box */}
              <div className="p-4 rounded-lg border bg-muted/40 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-mono font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount ({discountPct}%):</span>
                    <span className="font-mono">- {formatCurrency(discountAmount)}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({taxPct}%):</span>
                    <span className="font-mono">+ {formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between text-sm font-bold text-foreground">
                  <span>Grand Total:</span>
                  <span className="font-mono text-primary text-base">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>

                <Button
                  className="w-full mt-2 gap-2"
                  disabled={!canCreate || createQuote.isPending}
                  onClick={() => createQuote.mutate()}
                >
                  <FileText className="w-4 h-4" />
                  {createQuote.isPending ? "Generating..." : "Save Quotation"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quote Register Table */}
        <Card>
          <CardHeader>
            <CardTitle>Quotation Register</CardTitle>
            <CardDescription>{quotesQuery.data?.length ?? 0} quotation(s) issued</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {quotesQuery.data?.length ? (
              <div className="divide-y rounded-lg border">
                {quotesQuery.data.map((quote) => {
                  const isConverted = quote.status === "Converted";
                  const isAccepted = quote.status === "Accepted";
                  return (
                    <div
                      key={quote.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-muted/20 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-mono font-bold text-sm text-foreground">
                            {quote.quote_number || "Draft Quote"}
                          </span>
                          <Badge
                            className={
                              quote.status === "Accepted"
                                ? "bg-emerald-100 text-emerald-800"
                                : quote.status === "Converted"
                                  ? "bg-blue-100 text-blue-800"
                                  : quote.status === "Rejected"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-slate-100 text-slate-800"
                            }
                          >
                            {quote.status}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground">
                          Client:{" "}
                          <span className="font-medium text-foreground">
                            {quote.clients?.full_name || "Unassigned"}
                          </span>{" "}
                          · Created {formatDate(quote.created_at)}
                          {quote.expiry_date && ` · Expires ${formatDate(quote.expiry_date)}`}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-bold text-sm text-foreground font-mono">
                          {formatCurrency(Number(quote.total))}
                        </span>

                        <Select
                          value={quote.status}
                          onValueChange={(status) => updateStatus.mutate({ id: quote.id, status })}
                        >
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {["Draft", "Sent", "Accepted", "Rejected", "Expired"].map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {(isAccepted || quote.status === "Sent") && !isConverted && (
                          <Button
                            size="sm"
                            className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={convertQuote.isPending}
                            onClick={() => convertQuote.mutate(quote.id)}
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            Convert to Invoice
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground text-xs">
                No quotations recorded yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
