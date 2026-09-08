import { useEffect, useRef, useState } from "react";
import { Download, FileText, Printer } from "lucide-react";
import QRCode from "qrcode";

import { useBusinessSettings } from "@/data/settings";
import { useClient } from "@/data/clients";
import type { InvoiceItem, InvoiceWithRelations, PaymentWithRelations } from "@/data/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { downloadReceiptPdf } from "@/lib/pdf";
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
  const isPaidInFull = Number(invoice.balance) <= 0;
  const receiptStatus = isPaidInFull
    ? "PAID IN FULL"
    : Number(invoice.amount_paid) > 0
      ? "PARTIALLY PAID"
      : "PAYMENT RECEIVED";
  const logo = getImageUrls(settings?.logo_url)[0] || "/company-logo.png";
  const signatureUrls = getImageUrls(settings?.signature_url);
  const businessName =
    settings?.business_name === "Bargazal and Sons Tech Solution"
      ? "Bargazal and Sons Tech Solutions"
      : settings?.business_name || "Bargazal and Sons Tech Solutions";
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
      `Business: ${businessName}`,
      `Receipt number: ${payment?.payment_number || invoice.invoice_number}`,
      `Payment date: ${formatDate(payment?.payment_date)}`,
      `Issued to: ${client?.full_name || invoice.clients?.full_name || "Client"}`,
      `Invoice number: ${invoice.invoice_number}`,
      `Invoice total: ${formatCurrency(invoice.total)}`,
      `Amount paid: ${formatCurrency(invoice.amount_paid)}`,
      `Payment method: ${payment?.payment_method || "Payment received"}`,
      ...payments.map(
        (item) =>
          `Payment: ${item.payment_number}, ${formatCurrency(item.amount)}, ${item.payment_method}, ${formatDate(item.payment_date)}`,
      ),
      `STATUS: ${receiptStatus}`,
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
  }, [businessName, client, invoice, payment, payments, receiptStatus]);

  async function printReceipt() {
    if (!receiptRef.current) return;
    const stylesheet =
      document.querySelector<HTMLLinkElement>('link[rel="stylesheet"]')?.href ?? "";
    const receiptMarkup = receiptRef.current.innerHTML;
    const html = `
      <!doctype html>
      <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${businessName} - Receipt ${payment?.payment_number || invoice.invoice_number}</title><link rel="stylesheet" href="${stylesheet}">
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
      </style></head><body><div class="receipt">${receiptMarkup}</div></body></html>`;

    // Use a hidden iframe: mobile browsers block window.open popups.
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.position = "fixed";
    frame.style.right = "0";
    frame.style.bottom = "0";
    frame.style.width = "0";
    frame.style.height = "0";
    frame.style.border = "0";
    document.body.appendChild(frame);

    const frameDoc = frame.contentWindow?.document;
    if (!frameDoc) {
      document.body.removeChild(frame);
      return;
    }
    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    await new Promise((resolve) => window.setTimeout(resolve, 900));
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      /* printing unavailable */
    }
    window.setTimeout(() => {
      if (frame.parentNode) frame.parentNode.removeChild(frame);
    }, 3000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-y-auto print-receipt-dialog">
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
                <h1 className="text-xl font-bold">{businessName}</h1>
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
              <p className="mt-2 whitespace-nowrap text-sm">
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
            <div className="mt-3 space-y-1.5">
              <div className="text-base font-bold">
                {client?.full_name || invoice.clients?.full_name || "Client"}
              </div>
              {client?.address || client?.city || client?.state ? (
                <div>
                  <span className="font-semibold">Address:</span>{" "}
                  {[client?.address, client?.city, client?.state].filter(Boolean).join(", ")}
                </div>
              ) : null}
              {client?.phone ? (
                <div>
                  <span className="font-semibold">Phone No:</span> {client.phone}
                </div>
              ) : null}
              {client?.email ? (
                <div>
                  <span className="font-semibold">Email:</span> {client.email}
                </div>
              ) : null}
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
            <div className="mt-2 flex justify-between border-t border-slate-300 pt-3 font-semibold">
              <span>Amount paid</span>
              <strong className="text-base">{formatCurrency(invoice.amount_paid)}</strong>
            </div>
          </div>
          <div className="mt-6 bg-emerald-50 p-3 text-center font-bold text-emerald-700">
            {receiptStatus} · Invoice {invoice.invoice_number} ·{" "}
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
          <div className="mt-12 border-t border-slate-200 pt-3 text-center text-xs leading-5 text-slate-500">
            <strong className="block text-slate-700">{businessName}</strong>
            Thank you for choosing us. We truly value your trust and look forward to serving you
            again soon.
          </div>
        </div>
        <DialogFooter data-print-hide>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              downloadReceiptPdf({
                invoice,
                items: invoice.invoice_items,
                payments,
                clientName: client?.full_name || invoice.clients?.full_name || "Client",
                businessName,
              })
            }
          >
            <Download className="mr-2 h-4 w-4" />
            Download PDF
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
