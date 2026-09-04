import { useEffect, useRef, useState } from "react";
import { FileText, Printer } from "lucide-react";
import QRCode from "qrcode";

import { useBusinessSettings } from "@/data/settings";
import { useClient } from "@/data/clients";
import type { InvoiceItem, InvoiceWithRelations, PaymentWithRelations } from "@/data/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ReceiptInvoice = InvoiceWithRelations & { invoice_items: InvoiceItem[] };

type PaymentReceiptProps = {
  invoice: ReceiptInvoice;
  payments: PaymentWithRelations[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function getImageUrls(value: string | null | undefined) {
  if (!value) return [];
  const driveMatch = value.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([^/?]+)/);
  if (driveMatch?.[1]) {
    const id = encodeURIComponent(driveMatch[1]);
    return [
      `https://drive.google.com/thumbnail?id=${id}&sz=w1000`,
      `https://drive.google.com/uc?export=view&id=${id}`,
    ];
  }
  return [value];
}

export function PaymentReceipt({ invoice, payments, open, onOpenChange }: PaymentReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { data: settings } = useBusinessSettings();
  const { data: client } = useClient(invoice.client_id);
  const payment = payments[0];
  const logo = getImageUrls(settings?.logo_url)[0] || "/company-logo.png";
  const signatureUrls = getImageUrls(settings?.signature_url);
  const [signatureUrl, setSignatureUrl] = useState(signatureUrls[0] || "");
  const [signatureFailed, setSignatureFailed] = useState(false);
  const [qrCode, setQrCode] = useState("");

  useEffect(() => {
    setSignatureUrl(getImageUrls(settings?.signature_url)[0] || "");
    setSignatureFailed(false);
  }, [settings?.signature_url]);

  useEffect(() => {
    const receiptDetails = [
      "PAYMENT RECEIPT",
      `Business: ${settings?.business_name || "Bargazal and Sons Tech Solution"}`,
      `Receipt number: ${payment?.payment_number || invoice.invoice_number}`,
      `Payment date: ${formatDate(payment?.payment_date)}`,
      `Issued to: ${client?.full_name || invoice.clients?.full_name || "Client"}`,
      client?.company ? `Company: ${client.company}` : "",
      `Invoice number: ${invoice.invoice_number}`,
      `Invoice total: ${formatCurrency(invoice.total)}`,
      `Total paid: ${formatCurrency(invoice.amount_paid)}`,
      `Amount still owed: ${formatCurrency(invoice.balance)}`,
      `Payment method: ${payment?.payment_method || "Payment received"}`,
      ...payments.map(
        (item) =>
          `Payment: ${item.payment_number}, ${formatCurrency(item.amount)}, ${item.payment_method}, ${formatDate(item.payment_date)}`,
      ),
      "STATUS: PAID IN FULL",
    ]
      .filter(Boolean)
      .join("\n");
    QRCode.toDataURL(receiptDetails, {
      errorCorrectionLevel: "L",
      margin: 2,
      width: 300,
    })
      .then(setQrCode)
      .catch(() => setQrCode(""));
  }, [client, invoice, payment, payments, settings]);

  function printReceipt() {
    if (!receiptRef.current) return;
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return;
    const stylesheet =
      document.querySelector<HTMLLinkElement>('link[rel="stylesheet"]')?.href ?? "";
    printWindow.document.write(`
      <!doctype html>
      <html><head><title>Receipt ${payment?.payment_number || invoice.invoice_number}</title><link rel="stylesheet" href="${stylesheet}">
      <style>
        @page { size: A4; margin: 16mm; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #17202a; font: 14px Arial, sans-serif; }
        .receipt { max-width: 760px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid #17202a; padding-bottom: 20px; }
        .brand { display: flex; gap: 16px; align-items: center; }
        .logo { width: 76px; height: 76px; object-fit: contain; }
        h1, h2, p { margin: 0; } h1 { font-size: 24px; } h2 { font-size: 28px; letter-spacing: 2px; }
        .muted { color: #5f6b76; line-height: 1.55; } .meta { text-align: right; line-height: 1.8; }
        .section { margin-top: 28px; } .label { color: #5f6b76; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: .08em; }
        .client { border: 1px solid #d8dee4; padding: 14px; } .client strong { display: block; margin: 5px 0; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; } th, td { border-bottom: 1px solid #d8dee4; padding: 12px 8px; text-align: left; } th:last-child, td:last-child { text-align: right; }
        .totals { margin: 20px 0 0 auto; max-width: 300px; } .total-row { display: flex; justify-content: space-between; padding: 7px 0; } .grand { border-top: 2px solid #17202a; font-size: 18px; font-weight: bold; margin-top: 6px; padding-top: 12px; }
        .paid { background: #e7f5ed; color: #17663b; font-weight: bold; padding: 12px; text-align: center; margin-top: 24px; }
        .signature { margin-top: 64px; width: 220px; border-top: 1px solid #17202a; padding-top: 8px; }
        .footer { border-top: 1px solid #d8dee4; color: #5f6b76; margin-top: 48px; padding-top: 14px; text-align: center; font-size: 12px; }
      </style></head><body><div class="receipt">${receiptRef.current.innerHTML}</div>
      <script>window.onload = function () { window.print(); window.close(); };</script></body></html>`);
    printWindow.document.close();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl print-receipt-dialog">
        <DialogHeader data-print-hide>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Payment Receipt
          </DialogTitle>
          <DialogDescription>Full payment receipt ready to print or save as PDF.</DialogDescription>
        </DialogHeader>
        <div
          ref={receiptRef}
          className="receipt-printable rounded-md border bg-white p-5 text-slate-900 sm:p-8"
        >
          <div className="receipt-header flex flex-col justify-between gap-5 border-b-4 border-slate-900 pb-5 sm:flex-row sm:items-start">
            <div className="flex items-center gap-4">
              <img src={logo} alt="Company logo" className="h-16 w-16 object-contain" />
              <div>
                <h1 className="text-xl font-bold">
                  {settings?.business_name || "Bargazal and Sons Tech Solution"}
                </h1>
                <p className="mt-1 whitespace-pre-line text-xs leading-5 text-slate-500">
                  {settings?.address || "Business address"}
                </p>
                <p className="text-xs text-slate-500">
                  {[settings?.phone, settings?.email, settings?.website]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
            <div className="sm:text-right">
              <h2 className="text-2xl font-bold tracking-widest">RECEIPT</h2>
              <p className="mt-2 text-sm">
                <strong>Receipt no:</strong> {payment?.payment_number || "Generated payment"}
              </p>
              <p className="text-sm">
                <strong>Date:</strong> {formatDate(payment?.payment_date)}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-md border border-slate-200 p-4 text-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Receipt issued to
            </div>
            <strong className="mt-1 block text-base">
              {client?.full_name || invoice.clients?.full_name || "Client"}
            </strong>
            <div className="text-slate-500">
              {[client?.company, client?.address, client?.city, client?.state]
                .filter(Boolean)
                .join(", ")}
            </div>
            <div className="text-slate-500">
              {[client?.phone, client?.email].filter(Boolean).join(" · ")}
            </div>
          </div>

          <div className="mt-7">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Payment summary
            </div>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-3 text-left">Description</th>
                  <th className="py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.invoice_items.map((item) => (
                  <tr key={item.id} className="border-b border-slate-200">
                    <td className="py-3">
                      {item.description} <span className="text-slate-500">x {item.quantity}</span>
                    </td>
                    <td className="py-3 text-right">
                      {formatCurrency(Number(item.quantity) * Number(item.unit_price))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 ml-auto max-w-xs text-sm">
            <div className="flex justify-between py-1.5">
              <span>Total amount due</span>
              <strong>{formatCurrency(invoice.total)}</strong>
            </div>
            <div className="flex justify-between py-1.5">
              <span>Total paid</span>
              <strong>{formatCurrency(invoice.amount_paid)}</strong>
            </div>
            <div className="flex justify-between border-t-2 border-slate-900 pt-3 text-lg font-bold">
              <span>Amount still owed</span>
              <span>{formatCurrency(invoice.balance)}</span>
            </div>
          </div>
          <div className="mt-6 bg-emerald-50 p-3 text-center font-bold text-emerald-700">
            PAID IN FULL · Invoice {invoice.invoice_number} ·{" "}
            {payment?.payment_method || "Payment received"}
          </div>
          <div className="mt-12 flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
            <div className="w-56 text-sm">
              {signatureUrl && !signatureFailed ? (
                <img
                  src={signatureUrl}
                  alt="Authorized signature"
                  className="mb-2 h-14 w-48 object-contain object-left"
                  onError={() => {
                    const nextUrl = signatureUrls.find((url) => url !== signatureUrl);
                    if (nextUrl) setSignatureUrl(nextUrl);
                    else setSignatureFailed(true);
                  }}
                />
              ) : signatureFailed ? (
                <div className="mb-2 text-xs text-slate-500">
                  Signature image unavailable. Check that the Drive file is shared publicly.
                </div>
              ) : null}
              <div className="border-t border-slate-900 pt-2">Authorized signature</div>
            </div>
            {qrCode ? (
              <div className="text-center text-xs text-slate-500">
                <img
                  src={qrCode}
                  alt="Scan to view receipt details"
                  className="mx-auto h-44 w-44"
                />
                <div className="mt-1">Scan to view receipt details</div>
              </div>
            ) : null}
          </div>
          <div className="mt-12 border-t border-slate-200 pt-3 text-center text-xs text-slate-500">
            Thank you for your business.
          </div>
        </div>
        <DialogFooter data-print-hide>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={printReceipt}>
            <Printer className="mr-2 h-4 w-4" />
            Print / Save PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
