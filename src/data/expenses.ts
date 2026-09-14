import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { notifyError } from "@/lib/errors";
import { logActivity } from "./activity";
import type { Expense, ExpenseInput } from "./types";
import { fetchAllPages } from "@/lib/paginate";

const KEY = ["expenses"] as const;

export function useExpenses() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Expense[]> => {
      return fetchAllPages((from, to) =>
        supabase
          .from("expenses")
          .select("*")
          .order("expense_date", { ascending: false })
          .range(from, to),
      );
    },
  });
}

export function useSaveExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string | undefined; values: ExpenseInput }) => {
      if (id) {
        const { data, error } = await supabase
          .from("expenses")
          .update(values)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        await logActivity("expense", data.id, "updated", data.description);
        return data;
      }
      const { data, error } = await supabase
        .from("expenses")
        .insert({ ...values, expense_number: "" })
        .select()
        .single();
      if (error) throw error;
      await logActivity("expense", data.id, "created", data.description);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      toast.success(
        variables.id ? "Expense updated successfully" : "Expense recorded successfully",
      );
    },
    onError: (error) => notifyError(error, "Could not save expense"),
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Expense deleted");
    },
    onError: (error) => notifyError(error, "Could not delete expense"),
  });
}

export function useApproveExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("expenses")
        .update({
          approval_status: "approved",
          approved_by: user?.id || null,
          approved_at: new Date().toISOString(),
        } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await logActivity("expense", id, "approved", data.description);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Expense approved");
    },
    onError: (error) => notifyError(error, "Could not approve expense"),
  });
}

export function useRejectExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error } = await supabase
        .from("expenses")
        .update({
          approval_status: "rejected",
          rejection_reason: reason,
        } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await logActivity("expense", id, "rejected", data.description);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Expense rejected");
    },
    onError: (error) => notifyError(error, "Could not reject expense"),
  });
}
