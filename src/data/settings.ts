import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { notifyError } from "@/lib/errors";
import type { BusinessSettings } from "./types";

export function useBusinessSettings() {
  return useQuery({
    queryKey: ["business_settings"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<BusinessSettings | null> => {
      const { data, error } = await supabase
        .from("business_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveBusinessSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<BusinessSettings> }) => {
      const { error } = await supabase.from("business_settings").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["business_settings"] });
      toast.success("Business settings saved");
    },
    onError: (error) => notifyError(error, "Could not save settings"),
  });
}
