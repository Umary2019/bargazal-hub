import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { notifyError } from "@/lib/errors";
import { logActivity } from "./activity";
import type { Database } from "@/integrations/supabase/types";

export type ServiceRequest = Database["public"]["Tables"]["service_requests"]["Row"] & {
  clients?: { id: string; full_name: string; email: string | null; phone: string | null } | null;
  services?: { id: string; name: string } | null;
  projects?: { id: string; project_number: string; title: string; status: string } | null;
};

const KEY = ["service_requests"] as const;
const SELECT = "*, clients(id, full_name, email, phone), services(id, name), projects(id, project_number, title, status)";

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

export function usePendingServiceRequestsCount() {
  return useQuery({
    queryKey: ["service_requests", "pending_count"],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("service_requests")
        .select("*", { count: "exact", head: true })
        .eq("status", "Pending");
      if (error) return 0;
      return count ?? 0;
    },
    refetchInterval: 30000,
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
    onSuccess: (_data, values) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["client-portal", values.client_id] });
      qc.invalidateQueries({ queryKey: ["service_requests", "pending_count"] });
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
      if (request.status !== "Pending") {
        throw new Error(`Cannot approve request. It is already ${request.status}.`);
      }

      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData.user?.id ?? null;

      // Try RPC first
      try {
        const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
          "approve_service_request",
          {
            _request_id: request.id,
            _assigned_staff_id: assignedStaffId || null,
            _admin_note: note || null,
          },
        );
        if (!rpcError && rpcData) {
          return rpcData;
        }
        if (
          rpcError &&
          !rpcError.message?.includes("does not exist") &&
          !rpcError.message?.includes("not found")
        ) {
          throw rpcError;
        }
      } catch (err: any) {
        if (
          !err.message?.includes("does not exist") &&
          !err.message?.includes("not found")
        ) {
          throw err;
        }
      }

      // Fallback direct mutation
      const now = new Date().toISOString();
      const { data: project, error: projectError } = await supabase
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
          assigned_staff_id: assignedStaffId || null,
          status: "Pending",
        })
        .select()
        .single();
      if (projectError) throw projectError;

      const { error: updateError } = await (supabase as any)
        .from("service_requests")
        .update({
          status: "Approved",
          project_id: project.id,
          approved_by: currentUserId,
          approved_at: now,
          processed_by: currentUserId,
          processed_at: now,
          admin_note: note || request.admin_note,
          updated_at: now,
        })
        .eq("id", request.id)
        .eq("status", "Pending");
      if (updateError) throw updateError;

      await logActivity(
        "service_request",
        request.id,
        "approved",
        `Approved service request: ${request.title}`,
      );
      return project;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["client-portal"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      qc.invalidateQueries({ queryKey: ["service_requests", "pending_count"] });
      toast.success("Request approved and project created successfully");
    },
    onError: (error) => notifyError(error, "Could not approve request"),
  });
}

export function useRejectServiceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      reason,
      note,
      currentStatus,
      requestTitle,
    }: {
      id: string;
      reason: string;
      note?: string;
      currentStatus?: string;
      requestTitle?: string;
    }) => {
      const cleanReason = reason.trim();
      if (!cleanReason) {
        throw new Error("A rejection reason is required.");
      }
      if (currentStatus && currentStatus !== "Pending") {
        throw new Error(`Cannot reject request. It is already ${currentStatus}.`);
      }

      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData.user?.id ?? null;

      // Try RPC first
      try {
        const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
          "reject_service_request",
          {
            _request_id: id,
            _rejection_reason: cleanReason,
            _admin_note: note || cleanReason,
          },
        );
        if (!rpcError && rpcData) {
          return rpcData;
        }
        if (
          rpcError &&
          !rpcError.message?.includes("does not exist") &&
          !rpcError.message?.includes("not found")
        ) {
          throw rpcError;
        }
      } catch (err: any) {
        if (
          !err.message?.includes("does not exist") &&
          !err.message?.includes("not found")
        ) {
          throw err;
        }
      }

      // Fallback direct mutation
      const now = new Date().toISOString();
      const { error: updateError } = await (supabase as any)
        .from("service_requests")
        .update({
          status: "Rejected",
          rejection_reason: cleanReason,
          rejected_by: currentUserId,
          rejected_at: now,
          processed_by: currentUserId,
          processed_at: now,
          admin_note: note || cleanReason,
          updated_at: now,
        })
        .eq("id", id)
        .eq("status", "Pending");
      if (updateError) throw updateError;

      await logActivity(
        "service_request",
        id,
        "rejected",
        `Rejected service request: ${requestTitle || id}. Reason: ${cleanReason}`,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["client-portal"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      qc.invalidateQueries({ queryKey: ["service_requests", "pending_count"] });
      toast.success("Request has been rejected and the client has been notified");
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
