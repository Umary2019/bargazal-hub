import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export function useMyClient() {
  return useQuery({
    queryKey: ["my-client"],
    queryFn: async () => {
      const { data, error } = await db
        .from("clients")
        .select("*")
        .eq("auth_user_id", (await supabase.auth.getUser()).data.user?.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useClientPortalData(clientId: string | undefined) {
  return useQuery({
    queryKey: ["client-portal", clientId],
    enabled: Boolean(clientId),
    queryFn: async () => {
      const [requests, projects, invoices] = await Promise.all([
        db
          .from("service_requests")
          .select("*, services(name)")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false }),
        db
          .from("projects")
          .select("*, services(name)")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false }),
        db
          .from("invoices")
          .select("*")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false }),
      ]);
      for (const result of [requests, projects, invoices]) if (result.error) throw result.error;
      return {
        requests: requests.data ?? [],
        projects: projects.data ?? [],
        invoices: invoices.data ?? [],
      };
    },
  });
}

export function useCreateServiceRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      client_id: string;
      service_id: string;
      title: string;
      description: string;
      budget: number;
    }) => {
      const { data, error } = await db.from("service_requests").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, values) => {
      queryClient.invalidateQueries({ queryKey: ["client-portal", values.client_id] });
    },
  });
}
