import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { notifyError } from "@/lib/errors";
import { logActivity } from "./activity";
import type { Invoice, InvoiceItem, InvoiceWithRelations } from "./types";
import type { Database } from "@/integrations/supabase/types";

const KEY = ["invoices"] as const;
const SELECT = "*, clients(id, full_name), projects(id, title, project_number)";

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
  amount_paid?: number | undefined;
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

export function useInvoices(options?: { clientId?: string | undefined; projectId?: string | undefined }) {
  return useQuery({
    queryKey: [...KEY, options?.clientId ?? "all", options?.projectId ?? "all"],
    queryFn: async (): Promise<InvoiceWithRelations[]> => {
      let query = supabase
        .from("invoices")
        .select(SELECT)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (options?.clientId) query = query.eq("client_id", options.clientId);
      if (options?.projectId) query = query.eq("project_id", options.projectId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as InvoiceWithRelations[];
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
      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
      const header = Object.fromEntries(
        Object.entries(rest).filter(([, value]) => value !== undefined),
      ) as Record<string, unknown>;

      let invoiceId = id;
      if (id) {
        const { error } = await supabase
          .from("invoices")
          .update({ ...header, subtotal } as never)
          .eq("id", id);
        if (error) throw error;
        const { error: delError } = await supabase
          .from("invoice_items")
          .delete()
          .eq("invoice_id", id);
        if (delError) throw delError;
      } else {
        const { data, error } = await supabase
          .from("invoices")
          .insert({ ...header, subtotal, invoice_number: "" } as never)
          .select()
          .single();
        if (error) throw error;
        invoiceId = data.id;
      }


      if (items.length > 0) {
        const { error } = await supabase.from("invoice_items").insert(
          items.map((item) => ({
            invoice_id: invoiceId!,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            service_id: item.service_id || null,
          })),
        );
        if (error) throw error;
      }

      const { data: fresh, error: freshError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId!)
        .single();
      if (freshError) throw freshError;
      await logActivity("invoice", fresh.id, id ? "updated" : "created", fresh.invoice_number);
      return fresh;
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
