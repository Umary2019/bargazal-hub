import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { downloadInvoicePdf } from "@/lib/pdf";

export const Route = createFileRoute("/public/invoices/$token")({ component: PublicInvoicePage });

type PublicInvoice = {
  invoice: {
    invoice_number: string;
    issue_date: string;
    due_date: string | null;
    total: number;
    amount_paid: number;
    balance: number;
    status: string;
  };
  items: Array<{ id: string; description: string; quantity: number; unit_price: number }>;
  client: { full_name: string; email: string | null; phone: string | null };
  business: {
    business_name: string;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    address: string | null;
    bank_name: string | null;
    bank_account_name: string | null;
    bank_account_number: string | null;
    payment_instructions: string | null;
  } | null;
};

function PublicInvoicePage() {
  const { token } = Route.useParams();
  const query = useQuery({
    queryKey: ["public-invoice", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_public_invoice" as never,
        { _token: token } as never,
      );
      if (error || !data) throw error ?? new Error("Invoice link is invalid or expired");
      return data as unknown as PublicInvoice;
    },
  });

  const [payLoading, setPayLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const refetch = query.refetch;

  // Paystack sends the payer back here with ?reference=... after checkout.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference");
    if (!reference) return;
    setVerifying(true);
    void (async () => {
      try {
        const response = await fetch("/api/public/paystack/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        });
        const result = (await response.json()) as { status?: string };
        if (result.status === "success") toast.success("Payment received. Thank you!");
        else toast.error("We could not confirm that payment yet.");
      } catch {
        toast.error("We could not confirm that payment yet.");
      } finally {
        setVerifying(false);
        window.history.replaceState({}, "", window.location.pathname);
        void refetch();
      }
    })();
  }, [refetch]);

  async function startPayment() {
    setPayLoading(true);
    try {
      const response = await fetch("/api/public/paystack/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = (await response.json()) as { authorizationUrl?: string; error?: string };
      if (!response.ok || !result.authorizationUrl) {
        toast.error(result.error ?? "Could not start the payment.");
        return;
      }
      window.location.href = result.authorizationUrl;
    } catch {
      toast.error("Could not start the payment.");
    } finally {
      setPayLoading(false);
    }
  }

  if (query.isLoading)
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading invoice...
      </div>
    );
  if (query.error || !query.data)
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-md">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="text-destructive" />
            <p>This invoice link is invalid, expired, or has been revoked.</p>
          </CardContent>
        </Card>
      </div>
    );

  const { invoice, items, client, business } = query.data;
  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{business?.business_name ?? "Invoice"}</h1>
            <p className="text-sm text-muted-foreground">{business?.address}</p>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold">{invoice.invoice_number}</div>
            <div className="text-sm text-muted-foreground">
              Issued {formatDate(invoice.issue_date)}
            </div>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Invoice for {client.full_name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap justify-between gap-4 text-sm">
              <span>Due: {invoice.due_date ? formatDate(invoice.due_date) : "On receipt"}</span>
              <span>{client.email ?? client.phone ?? ""}</span>
            </div>
            <div className="divide-y">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between gap-4 py-3">
                  <span>
                    {item.description} x {item.quantity}
                  </span>
                  <span>{formatCurrency(Number(item.quantity) * Number(item.unit_price))}</span>
                </div>
              ))}
            </div>
            <div className="ml-auto max-w-xs space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Total</span>
                <strong>{formatCurrency(invoice.total)}</strong>
              </div>
              <div className="flex justify-between">
                <span>Paid</span>
                <strong>{formatCurrency(invoice.amount_paid)}</strong>
              </div>
              <div className="flex justify-between border-t pt-2 text-base">
                <span>Balance</span>
                <strong>{formatCurrency(invoice.balance)}</strong>
              </div>
            </div>
            <div className="rounded-md border p-4 text-sm">
              <div className="font-semibold">Payment details</div>
              <p>
                {business?.bank_name} · {business?.bank_account_name} ·{" "}
                {business?.bank_account_number}
              </p>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {business?.payment_instructions}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-md bg-muted p-3">
              <span className="font-medium">Status: {invoice.status}</span>
              {invoice.balance <= 0 && <CheckCircle2 className="text-emerald-600" />}
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              {invoice.balance > 0 && (
                <Button onClick={startPayment} disabled={payLoading || verifying}>
                  {payLoading || verifying ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {verifying ? "Confirming payment..." : `Pay ${formatCurrency(invoice.balance)}`}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() =>
                  downloadInvoicePdf({
                    invoice,
                    items,
                    clientName: client.full_name,
                    businessName: business?.business_name ?? "Bargazal and Sons Tech Solution",
                    businessEmail: business?.email,
                    businessPhone: business?.phone,
                    paymentInstructions: business?.payment_instructions,
                  })
                }
              >
                Download PDF
              </Button>
              <Button variant="outline" onClick={() => window.print()}>
                Print
              </Button>
            </div>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground">
          Contact {business?.email ?? "the business"} for payment assistance.
        </p>
      </div>
    </div>
  );
}
