import { useState } from "react";
import {
  CreditCard,
  Download,
  FileCheck,
  Building2,
  Calendar,
  AlertCircle,
  Receipt,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";
import { getInvoicePaymentStatus } from "@/lib/invoice-status";
import { downloadInvoicePdf } from "@/lib/pdf";
import { useBusinessSettings } from "@/data/settings";
import { PaymentReceipt } from "@/components/payments/payment-receipt";

interface ClientInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any | null;
  client: any | null;
  onPayNow?: (invoice: any) => Promise<void>;
  isPaying?: boolean;
}

export function ClientInvoiceDialog({
  open,
  onOpenChange,
  invoice,
  client,
  onPayNow,
  isPaying = false,
}: ClientInvoiceDialogProps) {
  const { data: settings } = useBusinessSettings();
  const [receiptOpen, setReceiptOpen] = useState(false);

  if (!invoice) return null;

  const paymentStatus = getInvoicePaymentStatus(invoice);
  const isPaid = paymentStatus === "Paid";
  const items = invoice.invoice_items ?? [];
  const payments = invoice.payments ?? [];
  const latestPayment = payments.length > 0 ? payments[0] : null;

  const serviceName =
    invoice.projects?.services?.name ||
    invoice.projects?.title ||
    items[0]?.description ||
    "Technology Services";

  const businessName = settings?.business_name ?? "BARGAZAL AND SONS TECH SOLUTIONS";
  const businessEmail = settings?.email ?? "contact@bargazal.com";
  const businessPhone = settings?.phone ?? "09063406108";

  function handleDownloadPdf() {
    downloadInvoicePdf({
      invoice: {
        invoice_number: invoice.invoice_number,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        total: Number(invoice.total),
        amount_paid: Number(invoice.amount_paid),
        balance: Number(invoice.balance),
      },
      items:
        items.length > 0
          ? items
          : [
              {
                description: serviceName,
                quantity: 1,
                unit_price: Number(invoice.total),
              },
            ],
      clientName: client?.full_name || invoice.clients?.full_name || "Valued Client",
      businessName,
      businessEmail,
      businessPhone,
      paymentInstructions: settings?.payment_instructions,
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0 border shadow-xl">
          {/* Header Banner */}
          <div className="bg-slate-900 text-slate-100 p-6 sm:p-8 rounded-t-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">
                  Official Business Invoice
                </p>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
                  {businessName}
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  {businessEmail} · {businessPhone}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs text-slate-400">Invoice Number</span>
                <p className="font-mono text-lg font-bold text-white tracking-wider">
                  {invoice.invoice_number}
                </p>
                <div className="mt-1.5 inline-block">
                  <Badge
                    className={
                      isPaid
                        ? "bg-emerald-500 text-white font-medium px-3 py-1"
                        : paymentStatus === "Overdue"
                          ? "bg-red-500 text-white font-medium px-3 py-1"
                          : "bg-amber-500 text-white font-medium px-3 py-1"
                    }
                  >
                    {paymentStatus.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Bill To & Dates Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" /> Bill To
                </h4>
                <p className="text-base font-bold text-foreground">
                  {client?.full_name || invoice.clients?.full_name || "Client"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {client?.email || invoice.clients?.email || "No email on file"}
                </p>
                {(client?.phone || invoice.clients?.phone) && (
                  <p className="text-sm text-muted-foreground">
                    {client?.phone || invoice.clients?.phone}
                  </p>
                )}
                {client?.address && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {client.address}, {client.city || ""} {client.state || ""}
                  </p>
                )}
              </div>

              <div className="space-y-2 sm:text-right">
                <div>
                  <span className="text-xs text-muted-foreground">Issue Date</span>
                  <p className="text-sm font-medium">{formatDate(invoice.issue_date)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Due Date</span>
                  <p className="text-sm font-medium">
                    {invoice.due_date ? formatDate(invoice.due_date) : "Upon receipt"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Service / Project</span>
                  <p className="text-sm font-semibold text-primary">{serviceName}</p>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Service Breakdown
              </h4>
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b">
                    <tr>
                      <th className="py-2.5 px-4 text-left">Description</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-right">Unit Price</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.length === 0 ? (
                      <tr>
                        <td className="py-3 px-4 font-medium">{serviceName}</td>
                        <td className="py-3 px-3 text-center">1</td>
                        <td className="py-3 px-4 text-right">
                          {formatCurrency(Number(invoice.total))}
                        </td>
                        <td className="py-3 px-4 text-right font-medium">
                          {formatCurrency(Number(invoice.total))}
                        </td>
                      </tr>
                    ) : (
                      items.map((item: any) => (
                        <tr key={item.id}>
                          <td className="py-3 px-4 font-medium">{item.description}</td>
                          <td className="py-3 px-3 text-center">{item.quantity}</td>
                          <td className="py-3 px-4 text-right">
                            {formatCurrency(Number(item.unit_price))}
                          </td>
                          <td className="py-3 px-4 text-right font-medium">
                            {formatCurrency(Number(item.quantity) * Number(item.unit_price))}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 rounded-lg bg-muted/40 border">
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Payment Information:</p>
                <p>Protected with secure server-side Paystack transaction encryption.</p>
                {invoice.notes && <p className="italic">&ldquo;{invoice.notes}&rdquo;</p>}
              </div>

              <div className="w-full sm:w-64 space-y-1.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(Number(invoice.subtotal || invoice.total))}</span>
                </div>
                {Number(invoice.discount) > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(Number(invoice.discount))}</span>
                  </div>
                )}
                {Number(invoice.tax) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax:</span>
                    <span>{formatCurrency(Number(invoice.tax))}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base border-t pt-1.5 text-foreground">
                  <span>Total:</span>
                  <span>{formatCurrency(Number(invoice.total))}</span>
                </div>
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(Number(invoice.amount_paid))}</span>
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-1.5 text-amber-700 dark:text-amber-400">
                  <span>Balance Due:</span>
                  <span>{formatCurrency(Number(invoice.balance))}</span>
                </div>
              </div>
            </div>

            {/* Payment Record Verified Info if Paid */}
            {isPaid && latestPayment && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <FileCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Verified Paystack Payment Record
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Payment Date:</span>
                    <p className="font-medium">{formatDate(latestPayment.payment_date)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Payment Reference:</span>
                    <p className="font-mono font-medium truncate">{latestPayment.reference || "Online"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Channel:</span>
                    <p className="font-medium capitalize">{latestPayment.channel || "Paystack Online"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(Number(latestPayment.amount))}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-6 bg-muted/20 border-t flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                <Download className="h-4 w-4 mr-1.5" /> Download PDF
              </Button>
              {Number(invoice.amount_paid) > 0 && (
                <Button variant="outline" size="sm" onClick={() => setReceiptOpen(true)}>
                  <Receipt className="h-4 w-4 mr-1.5" /> View Receipt
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {!isPaid && onPayNow && (
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold shadow-sm"
                  onClick={() => onPayNow(invoice)}
                  disabled={isPaying}
                >
                  {isPaying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Preparing Checkout...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" /> Pay Now (
                      {formatCurrency(Number(invoice.balance || invoice.total))})
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {Number(invoice.amount_paid) > 0 && (
        <PaymentReceipt
          invoice={invoice}
          payments={payments}
          open={receiptOpen}
          onOpenChange={setReceiptOpen}
        />
      )}
    </>
  );
}
