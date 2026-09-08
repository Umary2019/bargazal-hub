import { jsPDF } from "jspdf";

export type InvoicePdfInput = {
  invoice: {
    invoice_number: string;
    issue_date: string;
    due_date: string | null;
    total: number;
    amount_paid: number;
    balance: number | null;
  };
  items: Array<{ description: string; quantity: number; unit_price: number }>;
  clientName: string;
  businessName: string;
  businessEmail?: string | null | undefined;
  businessPhone?: string | null | undefined;
  paymentInstructions?: string | null | undefined;
};

export function downloadInvoicePdf(input: InvoicePdfInput) {
  const pdf = new jsPDF();
  const money = (value: number | null) => `NGN ${Number(value || 0).toLocaleString()}`;
  let y = 22;

  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(input.businessName, 20, y);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text([input.businessEmail, input.businessPhone].filter(Boolean).join(" | "), 20, y + 7);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("INVOICE", 150, y);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text(input.invoice.invoice_number, 150, y + 7);
  y += 28;

  pdf.line(20, y, 190, y);
  y += 12;
  pdf.setFont("helvetica", "bold");
  pdf.text("Bill to", 20, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(input.clientName, 20, y + 7);
  pdf.text(`Issue date: ${input.invoice.issue_date}`, 125, y);
  pdf.text(`Due date: ${input.invoice.due_date ?? "On receipt"}`, 125, y + 7);
  y += 22;

  pdf.setFont("helvetica", "bold");
  pdf.text("Description", 20, y);
  pdf.text("Qty", 130, y);
  pdf.text("Amount", 160, y);
  y += 3;
  pdf.line(20, y, 190, y);
  y += 8;
  pdf.setFont("helvetica", "normal");
  for (const item of input.items) {
    pdf.text(item.description.slice(0, 68), 20, y);
    pdf.text(String(item.quantity), 130, y);
    pdf.text(money(Number(item.quantity) * Number(item.unit_price)), 160, y);
    y += 8;
    if (y > 265) {
      pdf.addPage();
      y = 20;
    }
  }
  y += 4;
  pdf.line(120, y, 190, y);
  y += 8;
  pdf.text(`Total: ${money(input.invoice.total)}`, 130, y);
  y += 7;
  pdf.text(`Paid: ${money(input.invoice.amount_paid)}`, 130, y);
  y += 7;
  pdf.setFont("helvetica", "bold");
  pdf.text(`Balance: ${money(input.invoice.balance)}`, 130, y);
  if (input.paymentInstructions) {
    y += 18;
    pdf.setFont("helvetica", "bold");
    pdf.text("Payment instructions", 20, y);
    pdf.setFont("helvetica", "normal");
    pdf.text(pdf.splitTextToSize(input.paymentInstructions, 165), 20, y + 7);
  }
  pdf.save(`${input.invoice.invoice_number}.pdf`);
}

export type ReceiptPdfInput = {
  invoice: {
    invoice_number: string;
    total: number;
    amount_paid: number;
  };
  items: Array<{ description: string; quantity: number; unit_price: number }>;
  payments: Array<{
    payment_number: string;
    amount: number;
    payment_method: string;
    payment_date: string;
  }>;
  clientName: string;
  businessName: string;
};

export function downloadReceiptPdf(input: ReceiptPdfInput) {
  const pdf = new jsPDF();
  const money = (value: number | null) => `NGN ${Number(value || 0).toLocaleString()}`;
  const latestPayment = input.payments[0];
  let y = 22;

  pdf.setFontSize(18);
  pdf.setFont("helvetica", "bold");
  pdf.text(input.businessName, 20, y);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.text("PAYMENT RECEIPT", 20, y + 8);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "bold");
  pdf.text(latestPayment?.payment_number || input.invoice.invoice_number, 145, y);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  if (latestPayment) pdf.text(latestPayment.payment_date, 145, y + 7);
  y += 28;

  pdf.line(20, y, 190, y);
  y += 12;
  pdf.setFont("helvetica", "bold");
  pdf.text("Received from", 20, y);
  pdf.text("Invoice", 125, y);
  pdf.setFont("helvetica", "normal");
  pdf.text(input.clientName, 20, y + 7);
  pdf.text(input.invoice.invoice_number, 125, y + 7);
  y += 24;

  pdf.setFont("helvetica", "bold");
  pdf.text("Description", 20, y);
  pdf.text("Amount", 160, y);
  y += 3;
  pdf.line(20, y, 190, y);
  y += 8;
  pdf.setFont("helvetica", "normal");
  for (const item of input.items) {
    pdf.text(item.description.slice(0, 68), 20, y);
    pdf.text(money(Number(item.quantity) * Number(item.unit_price)), 160, y);
    y += 8;
    if (y > 265) {
      pdf.addPage();
      y = 20;
    }
  }

  y += 4;
  pdf.line(120, y, 190, y);
  y += 8;
  pdf.text(`Invoice total: ${money(input.invoice.total)}`, 120, y);
  y += 7;
  pdf.text(`Amount paid: ${money(input.invoice.amount_paid)}`, 120, y);
  y += 7;
  pdf.setFont("helvetica", "bold");
  pdf.text("Payments received", 20, y);
  y += 7;
  pdf.setFont("helvetica", "normal");
  for (const payment of input.payments) {
    pdf.text(
      `${payment.payment_date} - ${payment.payment_method} - ${money(payment.amount)}`,
      20,
      y,
    );
    y += 7;
  }
  y += 10;
  pdf.setFont("helvetica", "bold");
  pdf.text("Thank you for your payment.", 20, y);
  pdf.save(`Receipt-${latestPayment?.payment_number || input.invoice.invoice_number}.pdf`);
}
