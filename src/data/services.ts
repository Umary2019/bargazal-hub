import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { notifyError } from "@/lib/errors";
import { logActivity } from "./activity";
import type { ServiceCategory, ServiceInput, ServiceWithCategory } from "./types";

const KEY = ["services"] as const;

export function useServiceCategories() {
  return useQuery({
    queryKey: ["service_categories"],
    queryFn: async (): Promise<ServiceCategory[]> => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useServices() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<ServiceWithCategory[]> => {
      const { data, error } = await supabase
        .from("services")
        .select("*, service_categories(*)")
        .order("sort_order")
        .limit(500);
      if (error) throw error;
      return (data ?? []) as ServiceWithCategory[];
    },
  });
}

export function useSaveService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: ServiceInput }) => {
      if (id) {
        const { data, error } = await supabase
          .from("services")
          .update(values)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        await logActivity("service", data.id, "updated", data.name);
        return data;
      }
      const { data, error } = await supabase.from("services").insert(values).select().single();
      if (error) throw error;
      await logActivity("service", data.id, "created", data.name);
      return data;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(variables.id ? "Service updated successfully" : "Service created successfully");
    },
    onError: (error) => notifyError(error, "Could not save service"),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Service deleted");
    },
    onError: (error) => notifyError(error, "Could not delete service"),
  });
}
