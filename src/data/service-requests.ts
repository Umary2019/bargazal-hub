import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { notifyError } from "@/lib/errors";
import { logActivity } from "./activity";
import type { Database } from "@/integrations/supabase/types";

export type ServiceRequest = Database["public"]["Tables"]["service_requests"]["Row"] & {
  clients?: { id: string; full_name: string; email: string | null; phone: string | null } | null;
  services?: { id: string; name: string } | null;
  projects?: {
    id: string;
    project_number: string;
    title: string;
    status: string;
    assigned_staff_id?: string | null;
  } | null;
};

const KEY = ["service_requests"] as const;
const SELECT =
  "*, clients(id, full_name, email, phone), services(id, name), projects(id, project_number, title, status, assigned_staff_id)";

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

export function useServiceRequest(id: string | undefined | null) {
  return useQuery({
    queryKey: ["service_request", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<ServiceRequest | null> => {
      const { data, error } = await supabase
        .from("service_requests")
        .select(SELECT)
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as ServiceRequest | null;
    },
  });
}

export function useServiceRequestInvoice(
  serviceRequestId?: string | null,
  projectId?: string | null,
) {
  return useQuery({
    queryKey: ["service_request_invoice", serviceRequestId, projectId],
    enabled: Boolean(serviceRequestId || projectId),
    queryFn: async () => {
      if (serviceRequestId) {
        const { data } = await supabase
          .from("invoices")
          .select("id, invoice_number, total, amount_paid, balance, status, issue_date")
          .eq("service_request_id", serviceRequestId)
          .maybeSingle();
        if (data) return data;
      }
      if (projectId) {
        const { data } = await supabase
          .from("invoices")
          .select("id, invoice_number, total, amount_paid, balance, status, issue_date")
          .eq("project_id", projectId)
          .maybeSingle();
        if (data) return data;
      }
      return null;
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

function isRpcMissingOrCacheError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  const details = (err.details || "").toLowerCase();
  const code = String(err.code || "");
  return (
    code === "PGRST202" ||
    code === "42883" ||
    msg.includes("schema cache") ||
    msg.includes("could not find the function") ||
    msg.includes("could not find") ||
    msg.includes("does not exist") ||
    msg.includes("not found") ||
    details.includes("schema cache") ||
    details.includes("searched for the function")
  );
}

export function useApproveServiceRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      request,
      assignedStaffId,
      note,
      invoiceAmount,
      dueDate,
    }: {
      request: ServiceRequest;
      assignedStaffId?: string | null | undefined;
      note?: string | null | undefined;
      invoiceAmount?: number | null | undefined;
      dueDate?: string | null | undefined;
    }) => {
      if (request.status !== "Pending") {
        throw new Error(`Cannot approve request. It is already ${request.status}.`);
      }

      // Sanitize assigned staff: 'unassigned' or empty string -> null
      const targetStaffId =
        assignedStaffId && assignedStaffId !== "unassigned" ? assignedStaffId : null;

      // Validate staff eligibility if an ID was selected
      if (targetStaffId) {
        const { data: validRole, error: roleError } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("user_id", targetStaffId)
          .eq("role", "staff")
          .maybeSingle();

        if (roleError || !validRole) {
          throw new Error("The selected staff member is not valid or eligible for assignment.");
        }
      }

      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData.user?.id ?? null;

      const finalAmount = Number(
        invoiceAmount !== undefined && invoiceAmount !== null
          ? invoiceAmount
          : (request.budget ?? 0),
      );
      const finalDueDate =
        dueDate ||
        request.preferred_deadline ||
        new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

      // 1. Try RPC first (with migration 0011 args)
      try {
        const { data: rpcData, error: rpcError } = await (supabase as any).rpc(
          "approve_service_request",
          {
            _request_id: request.id,
            _assigned_staff_id: targetStaffId,
            _admin_note: note || null,
            _invoice_amount: finalAmount,
            _invoice_due_date: finalDueDate,
          },
        );
        if (!rpcError && rpcData) {
          return rpcData;
        }
        if (rpcError) {
          if (!isRpcMissingOrCacheError(rpcError)) {
            throw rpcError;
          }
          console.warn(
            "[service-requests] approve_service_request RPC not found in schema cache. Falling back to direct database transaction.",
            rpcError,
          );
        }
      } catch (err: any) {
        if (!isRpcMissingOrCacheError(err)) {
          throw err;
        }
        console.warn(
          "[service-requests] approve_service_request RPC error, executing direct transaction.",
          err,
        );
      }

      // 2. Direct database transaction fallback
      // Verify the current status is still Pending in the database
      const { data: freshReq, error: freshError } = await (supabase as any)
        .from("service_requests")
        .select("id, status")
        .eq("id", request.id)
        .single();

      if (freshError) throw freshError;
      if (freshReq.status !== "Pending") {
        throw new Error(`Cannot approve request. It is already ${freshReq.status}.`);
      }

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
          budget: finalAmount,
          deadline: request.preferred_deadline,
          assigned_staff_id: targetStaffId,
          status: "Pending",
        })
        .select()
        .single();
      if (projectError) throw projectError;

      // Duplicate invoice protection (Requirement 16)
      let invoiceId: string | null = null;
      try {
        const { data: existingInv } = await (supabase as any)
          .from("invoices")
          .select("id")
          .eq("service_request_id", request.id)
          .maybeSingle();

        if (existingInv?.id) {
          invoiceId = existingInv.id;
        } else {
          // Automatic invoice creation
          const invoicePayload = {
            invoice_number: "",
            client_id: request.client_id,
            project_id: project.id,
            service_request_id: request.id,
            issue_date: new Date().toISOString().slice(0, 10),
            due_date: finalDueDate,
            subtotal: finalAmount,
            discount: 0,
            tax: 0,
            total: finalAmount,
            amount_paid: 0,
            status: "Sent" as const,
            notes: request.details || null,
          };

          let { data: newInv, error: invError } = await (supabase as any)
            .from("invoices")
            .insert(invoicePayload)
            .select("id, invoice_number")
            .single();

          if (
            invError &&
            (invError.code === "PGRST204" ||
              (invError.message || "").toLowerCase().includes("column"))
          ) {
            // Fallback if migration 0011 column is not in DB schema cache yet
            const { service_request_id: _srid, ...basePayload } = invoicePayload;
            const retryInv = await (supabase as any)
              .from("invoices")
              .insert(basePayload)
              .select("id, invoice_number")
              .single();
            newInv = retryInv.data;
            invError = retryInv.error;
          }

          if (!invError && newInv) {
            invoiceId = newInv.id;
            // Create line item
            await (supabase as any).from("invoice_items").insert({
              invoice_id: newInv.id,
              service_id: request.service_id,
              description: request.title || "Service Request",
              quantity: 1,
              unit_price: finalAmount,
            });

            // Create public token
            try {
              await (supabase as any).from("invoice_public_tokens").insert({
                invoice_id: newInv.id,
                created_by: currentUserId,
              });
            } catch (tokenErr) {
              console.warn("Could not create invoice token:", tokenErr);
            }
          }
        }
      } catch (invCreateErr) {
        console.warn("Automatic invoice generation error in fallback:", invCreateErr);
      }

      // Update service request status
      const fullUpdatePayload = {
        status: "Approved",
        project_id: project.id,
        approved_by: currentUserId,
        approved_at: now,
        processed_by: currentUserId,
        processed_at: now,
        admin_note: note || request.admin_note,
        updated_at: now,
      };

      let { error: updateError } = await (supabase as any)
        .from("service_requests")
        .update(fullUpdatePayload)
        .eq("id", request.id)
        .eq("status", "Pending");

      // If tracking columns from migration 0010 are not present in remote schema cache, fallback to base columns
      if (
        updateError &&
        (updateError.code === "PGRST204" ||
          (updateError.message || "").toLowerCase().includes("column"))
      ) {
        const baseUpdatePayload = {
          status: "Approved",
          project_id: project.id,
          admin_note: note || request.admin_note,
          updated_at: now,
        };
        const retryResult = await (supabase as any)
          .from("service_requests")
          .update(baseUpdatePayload)
          .eq("id", request.id)
          .eq("status", "Pending");
        updateError = retryResult.error;
      }
      if (updateError) throw updateError;

      await logActivity(
        "service_request",
        request.id,
        "approved",
        `Approved service request: ${request.title}${targetStaffId ? " with staff assigned" : ""} and generated invoice`,
      );
      return { project, invoiceId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["client-portal"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      qc.invalidateQueries({ queryKey: ["service_requests", "pending_count"] });
      toast.success("Request approved, project created, and invoice generated");
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
      note?: string | null | undefined;
      currentStatus?: string | null | undefined;
      requestTitle?: string | null | undefined;
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

      // 1. Try RPC first
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
        if (rpcError) {
          if (!isRpcMissingOrCacheError(rpcError)) {
            throw rpcError;
          }
          console.warn(
            "[service-requests] reject_service_request RPC not found in schema cache. Falling back to direct database transaction.",
            rpcError,
          );
        }
      } catch (err: any) {
        if (!isRpcMissingOrCacheError(err)) {
          throw err;
        }
        console.warn(
          "[service-requests] reject_service_request RPC error, executing direct transaction.",
          err,
        );
      }

      // 2. Direct database transaction fallback
      const now = new Date().toISOString();
      const fullUpdatePayload = {
        status: "Rejected",
        rejection_reason: cleanReason,
        rejected_by: currentUserId,
        rejected_at: now,
        processed_by: currentUserId,
        processed_at: now,
        admin_note: note || cleanReason,
        updated_at: now,
      };

      let { error: updateError } = await (supabase as any)
        .from("service_requests")
        .update(fullUpdatePayload)
        .eq("id", id)
        .eq("status", "Pending");

      // Fallback to base columns if new columns do not exist
      if (
        updateError &&
        (updateError.code === "PGRST204" ||
          (updateError.message || "").toLowerCase().includes("column"))
      ) {
        const baseUpdatePayload = {
          status: "Rejected",
          admin_note: note || cleanReason,
          updated_at: now,
        };
        const retryResult = await (supabase as any)
          .from("service_requests")
          .update(baseUpdatePayload)
          .eq("id", id)
          .eq("status", "Pending");
        updateError = retryResult.error;
      }
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
    onError: (error) => notifyError(error, "Could not reject request"),
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
