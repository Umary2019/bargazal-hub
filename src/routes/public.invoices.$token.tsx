import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { downloadInvoicePdf } from "@/lib/pdf";
import { initiatePaystackPayment, verifyPaystackPayment } from "@/data/paystack";

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
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
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

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get("reference");
    if (!reference || isVerifying) return;
    setIsVerifying(true);
    verifyPaystackPayment(reference)
      .then((res) => {
        if (res.status === "success") {
          void query.refetch();
          window.history.replaceState({}, "", window.location.pathname);
        } else {
          setPaymentError("Payment verification failed. Status: " + res.status);
        }
      })
      .catch((error: unknown) => {
        setPaymentError(error instanceof Error ? error.message : "Could not verify payment");
      })
      .finally(() => setIsVerifying(false));
  }, [isVerifying, query, token]);

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
  const amount = Number(paymentAmount || invoice.balance);

  async function startPayment() {
    setPaymentError(null);
    if (!Number.isFinite(amount) || amount <= 0 || amount > Number(invoice.balance)) {
      setPaymentError("Enter an amount no more than the outstanding balance.");
      return;
    }
    setIsPaying(true);
    try {
      const data = await initiatePaystackPayment({
        token,
        email: client.email || undefined,
        callbackUrl: window.location.href.split("?")[0],
      });
      if (data.authorizationUrl) {
        window.location.assign(data.authorizationUrl);
      } else {
        throw new Error("Could not start payment");
      }
    } catch (err: any) {
      setPaymentError(err?.message ?? "Could not start payment");
      setIsPaying(false);
    }
  }

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
            {Number(invoice.balance) > 0 && (
              <div className="space-y-3 rounded-md border border-primary/20 bg-primary/5 p-4 print:hidden">
                <div>
                  <div className="font-semibold">Pay securely online</div>
                  <p className="text-sm text-muted-foreground">
                    Payments are processed securely by Paystack.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    aria-label="Payment amount"
                    type="number"
                    min="1"
                    max={Number(invoice.balance)}
                    step="0.01"
                    placeholder={`Full balance: ${formatCurrency(invoice.balance)}`}
                    value={paymentAmount}
                    onChange={(event) => setPaymentAmount(event.target.value)}
                  />
                  <Button onClick={() => void startPayment()} disabled={isPaying || isVerifying}>
                    {(isPaying || isVerifying) && <Loader2 className="mr-2 size-4 animate-spin" />}
                    {isVerifying ? "Confirming..." : "Pay with Paystack"}
                  </Button>
                </div>
                {paymentError && <p className="text-sm text-destructive">{paymentError}</p>}
              </div>
            )}
            <div className="flex gap-2 print:hidden">
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
