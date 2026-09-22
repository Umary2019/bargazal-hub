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
      const [requests, projects, invoices, quotes] = await Promise.all([
        db
          .from("service_requests")
          .select("*, services(name), projects(id, title, status, assigned_staff_id)")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false }),
        db
          .from("projects")
          .select("*, services(name)")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false }),
        db
          .from("invoices")
          .select(
            "*, projects(id, title, project_number, service_id, services(id, name)), invoice_items(*), payments(*), paystack_transactions(*)",
          )
          .eq("client_id", clientId)
          .order("created_at", { ascending: false }),
        db
          .from("quotes")
          .select("*, quote_items(*)")
          .eq("client_id", clientId)
          .order("created_at", { ascending: false }),
      ]);
      for (const result of [requests, projects, invoices, quotes])
        if (result.error) throw result.error;

      const reqList = requests.data ?? [];
      const projList = projects.data ?? [];
      const invList = invoices.data ?? [];
      const quoteList = quotes.data ?? [];

      const staffIds = new Set<string>();
      for (const p of projList) {
        if (p.assigned_staff_id) staffIds.add(p.assigned_staff_id);
      }
      for (const r of reqList) {
        if (r.projects?.assigned_staff_id) staffIds.add(r.projects.assigned_staff_id);
      }

      let staffMap = new Map<string, { id: string; full_name: string; job_title: string | null }>();
      if (staffIds.size > 0) {
        const { data: staffProfiles } = await db
          .from("profiles")
          .select("id, full_name, job_title")
          .in("id", Array.from(staffIds));
        if (staffProfiles) {
          staffMap = new Map(staffProfiles.map((sp: any) => [sp.id, sp]));
        }
      }

      const enhancedRequests = reqList.map((r: any) => {
        const staffId = r.projects?.assigned_staff_id;
        const assignedStaff = staffId ? (staffMap.get(staffId) ?? null) : null;
        return {
          ...r,
          assigned_staff: assignedStaff,
        };
      });

      const enhancedProjects = projList.map((p: any) => {
        const staffId = p.assigned_staff_id;
        const assignedStaff = staffId ? (staffMap.get(staffId) ?? null) : null;
        return {
          ...p,
          assigned_staff: assignedStaff,
        };
      });

      return {
        requests: enhancedRequests,
        projects: enhancedProjects,
        invoices: invList,
        quotes: quoteList,
      };
    },
  });
}

export function useRespondToQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      quoteId,
      clientId,
      action,
      notes,
    }: {
      quoteId: string;
      clientId: string;
      action: "accept" | "reject";
      notes?: string;
    }) => {
      const { data, error } = await db.rpc("respond_to_quote", {
        _quote_id: quoteId,
        _client_id: clientId,
        _action: action,
        _notes: notes || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["client-portal", variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
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
      const { description, ...requestValues } = values;
      const { data, error } = await db
        .from("service_requests")
        .insert({ ...requestValues, details: description, status: "Pending" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, values) => {
      queryClient.invalidateQueries({ queryKey: ["client-portal", values.client_id] });
      queryClient.invalidateQueries({ queryKey: ["service_requests"] });
      queryClient.invalidateQueries({ queryKey: ["service_requests", "pending_count"] });
    },
  });
}
