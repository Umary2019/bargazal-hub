import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CreditCard, ExternalLink, Mail, MessageCircle, Pencil, Printer, Trash2 } from "lucide-react";
import { useState } from "react";

import { ProtectedRoute } from "@/components/app/protected-route";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInvoice } from "@/data/invoices";
import { useDeleteInvoice } from "@/data/invoices";
import { usePayments } from "@/data/payments";
import { formatCurrency, formatDate } from "@/lib/format";
import { InvoiceFormDialog } from "@/components/invoices/invoice-form-dialog";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { useNavigate } from "@tanstack/react-router";
import { PaymentReceipt } from "@/components/payments/payment-receipt";
import { useClient } from "@/data/clients";

export const Route = createFileRoute("/invoices/$id")({ component: InvoiceDetailPage });

function InvoiceDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: invoice, isLoading, error } = useInvoice(id);
  const { data: payments = [] } = usePayments({ invoiceId: id });
  const { data: client } = useClient(invoice?.client_id);
  const [editOpen, setEditOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const deleteInvoice = useDeleteInvoice();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="p-4 text-muted-foreground">Loading invoice...</div>
      </ProtectedRoute>
    );
  }
  if (error || !invoice)
    return (
      <ProtectedRoute>
        <div className="space-y-3 p-4">
          <h1 className="text-xl font-semibold">Invoice unavailable</h1>
          <p className="text-muted-foreground">This invoice could not be loaded.</p>
          <Button variant="outline" onClick={() => navigate({ to: "/invoices" })}>
            Back to invoices
          </Button>
        </div>
      </ProtectedRoute>
    );

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="print:hidden flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 h-8 px-2"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">{invoice.invoice_number}</h1>
            <p className="text-muted-foreground">
              {invoice.clients?.full_name || "Unknown client"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="px-3 py-1.5 text-base">
              {invoice.status}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1 h-4 w-4" /> Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-1 h-4 w-4" /> Print invoice
            </Button>
            {Number(invoice.amount_paid) > 0 && (
              <Button variant="outline" size="sm" onClick={() => setReceiptOpen(true)}>
                <Printer className="mr-1 h-4 w-4" /> Receipt
              </Button>
            )}
            {client?.email && (
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${client.email}?subject=Invoice ${invoice.invoice_number}&body=Your invoice total is ${formatCurrency(invoice.total)}. Balance due: ${formatCurrency(invoice.balance)}.`}>
                  <Mail className="mr-1 h-4 w-4" /> Email
                </a>
              </Button>
            )}
            {client?.whatsapp && (
              <Button variant="outline" size="sm" asChild>
                <a href={`https://wa.me/${client.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Invoice ${invoice.invoice_number}: ${formatCurrency(invoice.total)} total, ${formatCurrency(invoice.balance)} balance due.`)}`} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
                </a>
              </Button>
            )}
            <ConfirmDialog
              trigger={
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
              }
              title="Delete invoice?"
              description="This will permanently remove the invoice and its line items."
              onConfirm={() =>
                deleteInvoice.mutate(id, { onSuccess: () => navigate({ to: "/invoices" }) })
              }
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Subtotal</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {formatCurrency(invoice.subtotal)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Tax</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{formatCurrency(invoice.tax)}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">
              {formatCurrency(invoice.total)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Amount Paid</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-emerald-600">
              {formatCurrency(invoice.amount_paid)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Balance</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-amber-600">
              {formatCurrency(invoice.balance)}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {invoice.invoice_items.length === 0 && (
                <p className="py-4 text-sm text-muted-foreground">No line items recorded.</p>
              )}
              {invoice.invoice_items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <span>
                    {item.description}{" "}
                    <span className="text-muted-foreground">x {item.quantity}</span>
                  </span>
                  <span className="font-medium">
                    {formatCurrency(Number(item.quantity) * Number(item.unit_price))}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issue date</span>
                <span>{formatDate(invoice.issue_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due date</span>
                <span>{invoice.due_date ? formatDate(invoice.due_date) : "—"}</span>
              </div>
              {invoice.project_id && (
                <Link
                  to="/projects/$id"
                  params={{ id: invoice.project_id }}
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                >
                  Open linked project <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              )}
              {invoice.notes && (
                <p className="whitespace-pre-wrap text-muted-foreground">{invoice.notes}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Payments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {payments.length === 0 && (
                <p className="text-sm text-muted-foreground">No payments recorded.</p>
              )}
              {payments.map((payment) => (
                <div key={payment.id} className="flex justify-between text-sm">
                  <span>
                    {formatDate(payment.payment_date)} · {payment.payment_method}
                  </span>
                  <span className="font-medium">{formatCurrency(payment.amount)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
      <InvoiceFormDialog open={editOpen} onOpenChange={setEditOpen} invoice={invoice} />
      {Number(invoice.amount_paid) > 0 && (
        <PaymentReceipt
          invoice={invoice}
          payments={payments}
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
        />
      )}
    </ProtectedRoute>
  );
}
