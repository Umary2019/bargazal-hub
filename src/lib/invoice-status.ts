import type { Invoice } from "@/data/types";

export function getInvoicePaymentStatus(invoice: Pick<Invoice, "total" | "amount_paid" | "balance" | "due_date" | "status">) {
  if (invoice.status === "Cancelled") return "Cancelled";
  if (Number(invoice.total) > 0 && Number(invoice.balance ?? 0) <= 0) return "Paid";
  if (Number(invoice.amount_paid) > 0) return "Partially Paid";
  if (invoice.due_date && invoice.due_date < new Date().toISOString().slice(0, 10)) return "Overdue";
  return "Not Paid";
}