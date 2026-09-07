import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { notifyError } from "@/lib/errors";
import { logActivity } from "./activity";
import type { Database } from "@/integrations/supabase/types";

export type ServiceRequest = Database["public"]["Tables"]["service_requests"]["Row"] & {
  clients?: { id: string; full_name: string; email: string | null; phone: string | null } | null;
  services?: { id: string; name: string } | null;
};

const KEY = ["service_requests"] as const;
const SELECT = "*, clients(id, full_name, email, phone), services(id, name)";

export function useServiceRequests(options?: { clientId?: string | undefined }) {
  return useQuery({
    queryKey: [...KEY, options?.clientId ?? "all"],
    queryFn: async (): Promise<ServiceRequest[]> => {
      let query = supabase.from("service_requests").select(SELECT).order("created_at", {
        ascending: false,
      });
      if (options?.clientId) query = query.eq("client_id", options.clientId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ServiceRequest[];
    },
  });
}

export function useCreateServiceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      client_id: string;
      service_id?: string | null;
      title: string;
      details?: string | null;
      institution?: string | null;
      budget?: number;
      preferred_deadline?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("service_requests")
        .insert({
          client_id: values.client_id,
          service_id: values.service_id ?? null,
          title: values.title,
          details: values.details ?? null,
          institution: values.institution ?? null,
          budget: values.budget ?? 0,
          preferred_deadline: values.preferred_deadline ?? null,
          status: "Pending",
        })
        .select()
        .single();
      if (error) throw error;
      await logActivity("service_request", data.id, "created", data.title);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Request submitted. We'll review it shortly.");
    },
    onError: (error) => notifyError(error, "Could not submit your request"),
  });
}

export function useApproveServiceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      request,
      assignedStaffId,
      note,
    }: {
      request: ServiceRequest;
      assignedStaffId?: string | null;
      note?: string;
    }) => {
      const { data: project, error } = await supabase
        .from("projects")
        .insert({
          project_number: "",
          title: request.title,
          client_id: request.client_id,
          service_id: request.service_id,
          description: request.details,
          institution: request.institution,
          budget: Number(request.budget ?? 0),
          deadline: request.preferred_deadline,
          assigned_staff_id: assignedStaffId ?? null,
          status: "Pending",
        })
        .select()
        .single();
      if (error) throw error;

      const { error: updateError } = await supabase
        .from("service_requests")
        .update({
          status: "Approved",
          project_id: project.id,
          admin_note: note ?? null,
        })
        .eq("id", request.id);
      if (updateError) throw updateError;

      await logActivity("service_request", request.id, "approved", request.title);
      return project;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Request approved and project created");
    },
    onError: (error) => notifyError(error, "Could not approve request"),
  });
}

export function useRejectServiceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const { error } = await supabase
        .from("service_requests")
        .update({ status: "Rejected", admin_note: note ?? null })
        .eq("id", id);
      if (error) throw error;
      await logActivity("service_request", id, "rejected");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Request declined");
    },
    onError: (error) => notifyError(error, "Could not update request"),
  });
}

export function usePendingClients() {
  return useQuery({
    queryKey: ["clients", "pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSetClientApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await supabase
        .from("clients")
        .update({ approval_status: status })
        .eq("id", id);
      if (error) throw error;
      await logActivity("client", id, status === "approved" ? "approved" : "rejected");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Client account updated");
    },
    onError: (error) => notifyError(error, "Could not update client"),
  });
}
