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
      return fetchAllPages((from, to) => supabase.from("expenses").select("*").order("expense_date", { ascending: false }).range(from, to));
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
      toast.success(variables.id ? "Expense updated successfully" : "Expense recorded successfully");
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
