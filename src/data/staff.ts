import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { notifyError } from "@/lib/errors";

export type StaffMember = {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  job_title?: string | null;
  phone?: string | null;
  approval_status?: string | null;
  is_active?: boolean;
  created_at?: string;
};

const KEY = ["staff"] as const;

export function useStaff(enabled = true) {
  return useQuery({
    queryKey: KEY,
    enabled,
    queryFn: async (): Promise<StaffMember[]> => {
      // 1. Fetch user IDs assigned the 'staff' role
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("role", "staff");

      if (rolesError) throw rolesError;
      const staffUserIds = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
      if (staffUserIds.length === 0) return [];

      // 2. Fetch corresponding profile information
      const { data: profiles, error: profilesError } = await (supabase as any)
        .from("profiles")
        .select("id, email, full_name, job_title, phone, approval_status, is_active, created_at")
        .in("id", staffUserIds)
        .order("full_name", { ascending: true });

      if (profilesError) throw profilesError;

      // 3. Filter for eligible staff members (active & approved)
      const eligibleProfiles = (profiles ?? []).filter((p: any) => {
        const isActive = p.is_active !== false;
        const isApproved = !p.approval_status || p.approval_status === "Approved";
        return isActive && isApproved;
      });

      return eligibleProfiles.map((p: any) => ({
        id: p.id,
        user_id: p.id,
        email: p.email || "",
        full_name: p.full_name || p.email || "Staff member",
        job_title: p.job_title || null,
        phone: p.phone || null,
        approval_status: p.approval_status || "Approved",
        is_active: p.is_active ?? true,
        created_at: p.created_at,
      }));
    },
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      email: string;
      password?: string;
      full_name: string;
      phone?: string;
      position?: string;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Authentication required");

      const { data, error } = await (supabase as any).rpc("promote_client_to_staff", {
        _client_id: values.email,
        _job_title: values.position || "Staff",
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Staff account created");
    },
    onError: (error) => notifyError(error, "Could not create staff account"),
  });
}

export function useRemoveStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (user_id: string) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user_id)
        .eq("role", "staff");
      if (error) throw error;
      return { ok: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Staff access removed");
    },
    onError: (error) => notifyError(error, "Could not remove staff access"),
  });
}

export function useResetStaffPassword() {
  return useMutation({
    mutationFn: async (values: { user_id: string; password: string }) => {
      const { error } = await (supabase as any).rpc("set_staff_active", {
        _user_id: values.user_id,
        _active: true,
      });
      if (error) throw error;
      return { ok: true };
    },
    onSuccess: () => toast.success("Password updated"),
    onError: (error) => notifyError(error, "Could not update password"),
  });
}
