import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CreditCard,
  ExternalLink,
  Loader2,
  Mail,
  MessageCircle,
  Pencil,
  Printer,
  Share2,
  ShieldCheck,
  Trash2,
  Calendar,
  Ban,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { ProtectedRoute } from "@/components/app/protected-route";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInvoice, useDeleteInvoice, useInvoiceInstallments } from "@/data/invoices";
import { usePayments } from "@/data/payments";
import { useServiceRequest } from "@/data/service-requests";
import { initiatePaystackPayment, verifyPaystackPayment } from "@/data/paystack";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency, formatDate } from "@/lib/format";
import { InvoiceFormDialog } from "@/components/invoices/invoice-form-dialog";
import { InvoiceInstallmentsDialog } from "@/components/invoices/invoice-installments-dialog";
import { CancelInvoiceDialog } from "@/components/invoices/cancel-invoice-dialog";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { useNavigate } from "@tanstack/react-router";
import { PaymentReceipt } from "@/components/payments/payment-receipt";
import { useClient } from "@/data/clients";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBusinessSettings } from "@/data/settings";
import { downloadInvoicePdf } from "@/lib/pdf";
import { getInvoicePaymentStatus } from "@/lib/invoice-status";

export const Route = createFileRoute("/invoices/$id")({ component: InvoiceDetailPage });

function InvoiceDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role, clientId } = useAuth();
  const isClient = role === "client" || Boolean(clientId);
  const { data: invoice, isLoading, error } = useInvoice(id);
  const { data: payments = [] } = usePayments({ invoiceId: id });
  const { data: client } = useClient(invoice?.client_id);
  const { data: serviceRequest } = useServiceRequest(invoice?.service_request_id);
  const { data: settings } = useBusinessSettings();
  const [editOpen, setEditOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [sending, setSending] = useState<"email" | "whatsapp" | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [installmentsOpen, setInstallmentsOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const { data: installments = [] } = useInvoiceInstallments(id);
  const deleteInvoice = useDeleteInvoice();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference");
    if (!ref) return;

    verifyPaystackPayment(ref)
      .then((res) => {
        if (res.status === "success") {
          toast.success("Payment verified successfully!");
          queryClient.invalidateQueries({ queryKey: ["payments"] });
          queryClient.invalidateQueries({ queryKey: ["invoice", id] });
          queryClient.invalidateQueries({ queryKey: ["invoices"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        }
        const url = new URL(window.location.href);
        url.searchParams.delete("reference");
        url.searchParams.delete("payment");
        window.history.replaceState(
          {},
          "",
          url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ""),
        );
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not verify payment");
      });
  }, [id, queryClient]);

  const handlePayNow = async () => {
    if (!invoice) return;
    setIsPaying(true);
    try {
      const { authorizationUrl } = await initiatePaystackPayment({
        invoiceId: invoice.id,
        callbackUrl: `${window.location.origin}/invoices/${invoice.id}?payment=complete`,
      });
      if (authorizationUrl) {
        window.location.href = authorizationUrl;
      } else {
        throw new Error("Unable to obtain Paystack checkout URL");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to connect to Paystack");
      setIsPaying(false);
    }
  };

  async function sharePublicInvoice() {
    setSharing(true);
    try {
      const { data, error } = await supabase.rpc(
        "create_invoice_public_token" as never,
        { _invoice_id: id } as never,
      );
      if (error || !data) throw error ?? new Error("Could not create invoice link");
      const link = `${window.location.origin}/public/invoices/${data}`;
      await navigator.clipboard.writeText(link);
      toast.success("Secure invoice link copied");
    } catch (shareError) {
      toast.error(
        shareError instanceof Error ? shareError.message : "Could not create invoice link",
      );
    } finally {
      setSharing(false);
    }
  }

  async function sendNotification(channel: "email" | "whatsapp") {
    setSending(channel);
    try {
      const { data, error } = await supabase.functions.invoke("send-invoice-notification", {
        body: { invoiceId: id, channels: [channel] },
      });
      if (error) throw error;
      const result = data?.results?.[0];
      if (result?.status !== "sent") throw new Error(`${channel} delivery was not sent`);
      toast.success(`${channel === "email" ? "Email" : "WhatsApp"} sent successfully`);
    } catch (notificationError) {
      toast.error(
        notificationError instanceof Error ? notificationError.message : "Notification failed",
      );
    } finally {
      setSending(null);
    }
  }

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
              {getInvoicePaymentStatus(invoice)}
            </Badge>
            {Number(invoice.balance) > 0 && (
              <Button
                size="sm"
                className="bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
                onClick={handlePayNow}
                disabled={isPaying}
              >
                {isPaying ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-1 h-4 w-4" /> Pay with Paystack (
                    {formatCurrency(invoice.balance)})
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1 h-4 w-4" /> Edit
            </Button>
            {!isClient && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInstallmentsOpen(true)}
              >
                <Calendar className="mr-1 h-4 w-4" /> Installments
              </Button>
            )}
            {!isClient && invoice.status !== "Cancelled" && Number(invoice.balance) > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setCancelOpen(true)}
              >
                <Ban className="mr-1 h-4 w-4" /> Cancel
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="mr-1 h-4 w-4" /> Print invoice
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadInvoicePdf({
                  invoice,
                  items: invoice.invoice_items,
                  clientName: client?.full_name ?? invoice.clients?.full_name ?? "Client",
                  businessName: settings?.business_name ?? "Bargazal and Sons Tech Solution",
                  businessEmail: settings?.email,
                  businessPhone: settings?.phone,
                  paymentInstructions: settings?.payment_instructions,
                })
              }
            >
              Download PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void sharePublicInvoice()}
              disabled={sharing}
            >
              <Share2 className="mr-1 h-4 w-4" /> {sharing ? "Creating..." : "Share link"}
            </Button>
            {Number(invoice.amount_paid) > 0 && (
              <Button variant="outline" size="sm" onClick={() => setReceiptOpen(true)}>
                <Printer className="mr-1 h-4 w-4" /> Receipt
              </Button>
            )}
            {client?.email && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`mailto:${client.email}?subject=Invoice ${invoice.invoice_number}&body=Your invoice total is ${formatCurrency(invoice.total)}. Balance due: ${formatCurrency(invoice.balance)}.`}
                >
                  <Mail className="mr-1 h-4 w-4" /> Email
                </a>
              </Button>
            )}
            {client?.email && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void sendNotification("email")}
                disabled={sending !== null}
              >
                <Mail className="mr-1 h-4 w-4" />{" "}
                {sending === "email" ? "Sending..." : "Send email"}
              </Button>
            )}
            {client?.whatsapp && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`https://wa.me/${client.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Invoice ${invoice.invoice_number}: ${formatCurrency(invoice.total)} total, ${formatCurrency(invoice.balance)} balance due.`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
                </a>
              </Button>
            )}
            {client?.whatsapp && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void sendNotification("whatsapp")}
                disabled={sending !== null}
              >
                <MessageCircle className="mr-1 h-4 w-4" />{" "}
                {sending === "whatsapp" ? "Sending..." : "Send WhatsApp"}
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

        {/* Cancellation Notice Banner */}
        {invoice.status === "Cancelled" && (
          <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Invoice Cancelled</p>
              <p className="text-xs text-red-800 dark:text-red-300 mt-0.5">
                {(invoice as any).cancellation_reason || "This invoice has been officially cancelled."}
              </p>
            </div>
          </div>
        )}

        {/* Installment Payment Schedule */}
        {installments.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" /> Installment Payment Schedule ({installments.length} parts)
                </CardTitle>
                {!isClient && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setInstallmentsOpen(true)}
                  >
                    Modify Schedule
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                {installments.map((inst: any) => (
                  <div key={inst.id} className="p-2.5 rounded-lg border bg-background space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold">#{inst.installment_number}</span>
                      <Badge
                        variant={inst.status === "paid" ? "default" : "outline"}
                        className="text-[10px] capitalize"
                      >
                        {inst.status}
                      </Badge>
                    </div>
                    <div className="font-semibold text-sm text-foreground">
                      {formatCurrency(Number(inst.amount))}
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      Due: {inst.due_date ? formatDate(inst.due_date) : "Upon completion"}
                    </div>
                    {inst.notes && (
                      <p className="text-[10px] text-muted-foreground truncate">{inst.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

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
            <CardContent className="space-y-3.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issue date</span>
                <span>{formatDate(invoice.issue_date)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due date</span>
                <span>{invoice.due_date ? formatDate(invoice.due_date) : "—"}</span>
              </div>
              {invoice.service_request_id && (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/20">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-900 dark:text-indigo-300">
                      Originating Service Request
                    </span>
                    <Badge variant="outline" className="border-indigo-300 text-[11px]">
                      {serviceRequest?.status ?? "Linked"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs font-medium text-foreground">
                    {serviceRequest?.title ?? `Request #${invoice.service_request_id.slice(0, 8)}`}
                  </p>
                  <Link
                    to="/requests"
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:underline dark:text-indigo-300"
                  >
                    View in Requests Manager <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              )}
              {invoice.project_id && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-muted-foreground">Linked Project</span>
                  <Link
                    to="/projects/$id"
                    params={{ id: invoice.project_id }}
                    className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {invoice.projects?.project_number
                      ? `${invoice.projects.project_number} — `
                      : ""}
                    {invoice.projects?.title ?? "View Project"}{" "}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              )}
              {invoice.notes && (
                <p className="whitespace-pre-wrap text-muted-foreground">{invoice.notes}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" /> Payments & Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {payments.length === 0 && (
                <p className="text-sm text-muted-foreground">No payments recorded.</p>
              )}
              {payments.map((payment) => {
                const payRecord = payment as unknown as {
                  id: string;
                  amount: number;
                  payment_date: string;
                  payment_method: string;
                  channel?: string | null;
                  provider_reference?: string | null;
                  created_at?: string;
                  notes?: string | null;
                };
                return (
                  <div
                    key={payment.id}
                    className="rounded-lg border bg-card p-3 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-semibold"
                        >
                          <ShieldCheck className="mr-1 h-3 w-3 inline" /> Verified
                        </Badge>
                        <span className="font-semibold text-sm">
                          {payment.payment_method || "Paystack"}
                        </span>
                        {payRecord.channel && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] uppercase font-mono tracking-wider"
                          >
                            {payRecord.channel}
                          </Badge>
                        )}
                      </div>
                      <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-1">
                      <div>
                        <span className="text-muted-foreground/70">Payment Date:</span>{" "}
                        <span className="font-medium text-foreground">
                          {formatDate(payment.payment_date)}
                        </span>
                      </div>
                      {payRecord.provider_reference && (
                        <div className="text-right">
                          <span className="text-muted-foreground/70">Paystack Ref:</span>{" "}
                          <span className="font-mono text-foreground select-all font-semibold">
                            {payRecord.provider_reference}
                          </span>
                        </div>
                      )}
                    </div>
                    {payment.notes && (
                      <p className="text-xs text-muted-foreground border-t pt-1.5 mt-1 italic">
                        {payment.notes}
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
      <InvoiceFormDialog open={editOpen} onOpenChange={setEditOpen} invoice={invoice} />
      <InvoiceInstallmentsDialog
        open={installmentsOpen}
        onOpenChange={setInstallmentsOpen}
        invoice={invoice}
      />
      <CancelInvoiceDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        invoice={invoice}
      />
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
