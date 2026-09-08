import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { notifyError } from "@/lib/errors";
import { logActivity } from "./activity";
import type { PaymentInput, PaymentWithRelations } from "./types";
import { fetchAllPages } from "@/lib/paginate";

const KEY = ["payments"] as const;
const SELECT = "*, clients(id, full_name), invoices(id, invoice_number), projects(id, title)";

export function usePayments(options?: {
  clientId?: string | undefined;
  invoiceId?: string | undefined;
  projectId?: string | undefined;
}) {
  return useQuery({
    queryKey: [
      ...KEY,
      options?.clientId ?? "all",
      options?.invoiceId ?? "all",
      options?.projectId ?? "all",
    ],
    queryFn: async (): Promise<PaymentWithRelations[]> => {
      const rows = await fetchAllPages((from, to) => {
        let query = supabase
          .from("payments")
          .select(SELECT)
          .order("payment_date", { ascending: false })
          .is("voided_at", null)
          .range(from, to);
        if (options?.clientId) query = query.eq("client_id", options.clientId);
        if (options?.invoiceId) query = query.eq("invoice_id", options.invoiceId);
        if (options?.projectId) query = query.eq("project_id", options.projectId);
        return query;
      });
      return rows as PaymentWithRelations[];
    },
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string | undefined; values: PaymentInput }) => {
      if (id) {
        const { data, error } = await supabase
          .from("payments")
          .update(values)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        await logActivity("payment", data.id, "updated", data.payment_number);
        return data;
      }
      const { data, error } = await supabase
        .from("payments")
        .insert({ ...values, payment_number: "" })
        .select()
        .single();
      if (error) throw error;
      await logActivity("payment", data.id, "recorded", data.payment_number);
      return data;
    },
    onSuccess: (_data, variables) => {
      invalidateMoney(qc);
      toast.success(
        variables.id ? "Payment updated successfully" : "Payment recorded successfully",
      );
    },
    onError: (error) => notifyError(error, "Could not record payment"),
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateMoney(qc);
      toast.success("Payment deleted");
    },
    onError: (error) => notifyError(error, "Could not delete payment"),
  });
}

export function useVoidPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error } = await supabase
        .from("payments")
        .update({ voided_at: new Date().toISOString(), void_reason: reason.trim() || "Voided" })
        .eq("id", id)
        .is("voided_at", null)
        .select()
        .single();
      if (error) throw error;
      await logActivity("payment", data.id, "voided", reason);
      return data;
    },
    onSuccess: () => {
      invalidateMoney(qc);
      toast.success("Payment voided and balances recalculated");
    },
    onError: (error) => notifyError(error, "Could not void payment"),
  });
}

export function useDeleteAllPayments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("payments").delete().not("id", "is", null);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateMoney(qc);
      toast.success("All payment records cleared");
    },
    onError: (error) => notifyError(error, "Could not clear payment records"),
  });
}

function invalidateMoney(qc: ReturnType<typeof useQueryClient>) {
  for (const key of [
    ["payments"],
    ["invoices"],
    ["invoice"],
    ["projects"],
    ["project"],
    ["dashboard"],
    ["activity"],
  ]) {
    qc.invalidateQueries({ queryKey: key });
  }
}
