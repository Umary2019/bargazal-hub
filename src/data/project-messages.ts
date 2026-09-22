import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { notifyError } from "@/lib/errors";

export interface ProjectMessage {
  id: string;
  project_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: "client" | "staff" | "admin";
  message: string;
  created_at: string;
}

export function useProjectMessages(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-messages", projectId],
    enabled: Boolean(projectId),
    queryFn: async (): Promise<ProjectMessage[]> => {
      const { data, error } = await (supabase as any)
        .from("project_messages")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("Could not fetch project messages:", error);
        return [];
      }
      return data ?? [];
    },
    refetchInterval: 15000,
  });
}

export function usePostProjectMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, message }: { projectId: string; message: string }) => {
      const { data, error } = await (supabase as any).rpc("post_project_message", {
        _project_id: projectId,
        _message: message.trim(),
      });
      if (error) {
        // Fallback: direct insert if RPC not found
        const { data: userData } = await supabase.auth.getUser();
        const user = userData.user;
        if (!user) throw error;

        const { data: profile } = await (supabase as any)
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .maybeSingle();

        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        const role =
          roleRow?.role === "admin" ? "admin" : roleRow?.role === "staff" ? "staff" : "client";

        const { error: insErr } = await (supabase as any).from("project_messages").insert({
          project_id: projectId,
          sender_id: user.id,
          sender_name: profile?.full_name || user.email?.split("@")[0] || "User",
          sender_role: role,
          message: message.trim(),
        });
        if (insErr) throw insErr;
      }
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["project-messages", vars.projectId] });
      toast.success("Message sent");
    },
    onError: (error) => notifyError(error, "Could not send message"),
  });
}
