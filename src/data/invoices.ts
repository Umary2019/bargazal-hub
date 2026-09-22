import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { notifyError } from "@/lib/errors";
import { logActivity } from "./activity";
import type { Invoice, InvoiceItem, InvoiceWithRelations } from "./types";
import type { Database } from "@/integrations/supabase/types";
import { fetchAllPages } from "@/lib/paginate";

const KEY = ["invoices"] as const;
const SELECT =
  "*, clients(id, full_name, email, phone, whatsapp), projects(id, title, project_number, service_id, services(id, name)), payments(*)";

export type InvoiceItemDraft = {
  description: string;
  quantity: number;
  unit_price: number;
  service_id?: string | null;
};

export type InvoiceDraft = {
  client_id: string;
  project_id?: string | null | undefined;
  issue_date: string;
  due_date?: string | null | undefined;
  status: Database["public"]["Enums"]["invoice_status"];
  discount: number;
  tax: number;
  notes?: string | null | undefined;
  items: InvoiceItemDraft[];
};

export function computeInvoiceTotals(items: InvoiceItemDraft[], discount: number, taxRate: number) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const discounted = Math.max(subtotal - discount, 0);
  const tax = Math.round(discounted * (taxRate / 100) * 100) / 100;
  const total = Math.round((discounted + tax) * 100) / 100;
  return { subtotal, tax, total };
}

export function useInvoices(options?: {
  clientId?: string | undefined;
  projectId?: string | undefined;
}) {
  return useQuery({
    queryKey: [...KEY, options?.clientId ?? "all", options?.projectId ?? "all"],
    queryFn: async (): Promise<InvoiceWithRelations[]> => {
      const rows = await fetchAllPages((from, to) => {
        let query = supabase
          .from("invoices")
          .select(SELECT)
          .order("created_at", { ascending: false })
          .range(from, to);
        if (options?.clientId) query = query.eq("client_id", options.clientId);
        if (options?.projectId) query = query.eq("project_id", options.projectId);
        return query;
      });
      return rows as InvoiceWithRelations[];
    },
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ["invoice", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<InvoiceWithRelations & { invoice_items: InvoiceItem[] }> => {
      const { data, error } = await supabase
        .from("invoices")
        .select(`${SELECT}, invoice_items(*)`)
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data as InvoiceWithRelations & { invoice_items: InvoiceItem[] };
    },
  });
}

export function useSaveInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string | undefined;
      values: InvoiceDraft;
    }): Promise<Invoice> => {
      const { items, ...rest } = values;
      const { data: fresh, error } = await supabase.rpc(
        "save_invoice" as never,
        {
          _id: id ?? null,
          _client_id: rest.client_id,
          _project_id: rest.project_id ?? null,
          _issue_date: rest.issue_date,
          _due_date: rest.due_date ?? null,
          _status: rest.status,
          _discount: rest.discount,
          _tax: rest.tax,
          _notes: rest.notes ?? null,
          _items: items,
        } as never,
      );
      if (error) throw error;
      if (!fresh) throw new Error("Invoice save returned no record");
      const invoice = fresh as unknown as Invoice;
      await logActivity("invoice", invoice.id, id ? "updated" : "created", invoice.invoice_number);
      return invoice;
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["invoice", data.id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      toast.success(variables.id ? "Invoice updated successfully" : "Invoice created successfully");
    },
    onError: (error) => notifyError(error, "Could not save invoice"),
  });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: Database["public"]["Enums"]["invoice_status"];
    }) => {
      const { error } = await supabase.from("invoices").update({ status }).eq("id", id);
      if (error) throw error;
      await logActivity("invoice", id, `marked ${status}`);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["invoice", variables.id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Invoice status updated");
    },
    onError: (error) => notifyError(error, "Could not update invoice"),
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Invoice deleted");
    },
    onError: (error) => notifyError(error, "Could not delete invoice"),
  });
}

export function useCancelInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await (supabase as any)
        .from("invoices")
        .update({
          status: "Cancelled",
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      await logActivity("invoice", id, "cancelled", reason);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["invoice", vars.id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Invoice cancelled successfully");
    },
    onError: (error) => notifyError(error, "Could not cancel invoice"),
  });
}

export function useCheckOverdueInvoices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc("check_and_mark_overdue_invoices");
      if (error) {
        // Fallback: client-side scan
        const today = new Date().toISOString().split("T")[0];
        const { data: invs } = await (supabase as any)
          .from("invoices")
          .select("id, status, due_date, balance, total")
          .not("status", "in", '("Paid","Cancelled")')
          .lt("due_date", today);
        if (invs && invs.length > 0) {
          for (const inv of invs) {
            if (Number(inv.balance ?? inv.total) > 0) {
              await (supabase as any)
                .from("invoices")
                .update({ status: "Overdue" })
                .eq("id", inv.id);
            }
          }
        }
        return { updated_count: invs?.length ?? 0, notified_count: 0 };
      }
      return data?.[0] || { updated_count: 0, notified_count: 0 };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      if (res.updated_count > 0) {
        toast.info(`Updated ${res.updated_count} overdue invoice(s)`);
      }
    },
  });
}

export function useSendInvoiceReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invoiceId,
      clientId,
      reminderType,
      invoiceNumber,
      balance,
    }: {
      invoiceId: string;
      clientId: string;
      reminderType: string;
      invoiceNumber: string;
      balance: number;
    }) => {
      const { data: client } = await (supabase as any)
        .from("clients")
        .select("auth_user_id, full_name, email")
        .eq("id", clientId)
        .single();

      if (client?.auth_user_id) {
        await (supabase as any).rpc("create_notification_safe", {
          _user_id: client.auth_user_id,
          _title: `Payment Reminder: ${invoiceNumber}`,
          _message: `Reminder regarding invoice ${invoiceNumber}. Outstanding balance: ₦${balance.toLocaleString()}.`,
          _type: "invoice",
          _link: "/dashboard",
          _priority: "High",
          _related_entity: "invoice",
          _related_entity_id: invoiceId,
        });
      }

      await (supabase as any).from("invoice_reminder_logs").insert({
        invoice_id: invoiceId,
        reminder_type: reminderType,
        channel: "in_app",
        status: "Sent",
        recipient: client?.full_name || "Client",
        sent_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Payment reminder sent to client");
    },
    onError: (error) => notifyError(error, "Could not send reminder"),
  });
}

export function useInvoiceInstallments(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ["invoice-installments", invoiceId],
    enabled: Boolean(invoiceId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("invoice_installments")
        .select("*")
        .eq("invoice_id", invoiceId!)
        .order("installment_number", { ascending: true });
      if (error) return [];
      return data ?? [];
    },
  });
}

export function useSaveInstallments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      invoiceId,
      installments,
    }: {
      invoiceId: string;
      installments: Array<{ installment_number: number; amount: number; due_date?: string | null }>;
    }) => {
      // Delete existing pending installments
      await (supabase as any)
        .from("invoice_installments")
        .delete()
        .eq("invoice_id", invoiceId)
        .eq("status", "Pending");

      const rows = installments.map((inst) => ({
        invoice_id: invoiceId,
        installment_number: inst.installment_number,
        amount: inst.amount,
        due_date: inst.due_date || null,
        status: "Pending",
        created_at: new Date().toISOString(),
      }));

      const { error } = await (supabase as any).from("invoice_installments").insert(rows);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["invoice-installments", vars.invoiceId] });
      qc.invalidateQueries({ queryKey: ["invoice", vars.invoiceId] });
      toast.success("Payment installments saved");
    },
    onError: (error) => notifyError(error, "Could not save installments"),
  });
}
