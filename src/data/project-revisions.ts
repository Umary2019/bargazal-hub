import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { notifyError } from "@/lib/errors";

export interface ProjectRevision {
  id: string;
  project_id: string;
  client_id: string;
  requested_by: string;
  reason: string;
  status: "Pending" | "In Progress" | "Resolved" | "Closed";
  admin_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export function useProjectRevisions(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-revisions", projectId],
    enabled: Boolean(projectId),
    queryFn: async (): Promise<ProjectRevision[]> => {
      const { data, error } = await (supabase as any)
        .from("project_revisions")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });

      if (error) {
        // Table may be newly created or not yet seeded
        console.warn("Could not fetch project revisions:", error);
        return [];
      }
      return data ?? [];
    },
  });
}

export function useRequestRevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      reason,
    }: {
      projectId: string;
      reason: string;
    }) => {
      const { data, error } = await (supabase as any).rpc("request_project_revision", {
        _project_id: projectId,
        _reason: reason.trim(),
      });
      if (error) {
        // Fallback: direct insert if RPC not in cache
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;
        const { data: proj } = await supabase
          .from("projects")
          .select("client_id")
          .eq("id", projectId)
          .single();

        if (!userId || !proj) throw error;

        const { error: insErr } = await (supabase as any).from("project_revisions").insert({
          project_id: projectId,
          client_id: proj.client_id,
          requested_by: userId,
          reason: reason.trim(),
          status: "Pending",
        });
        if (insErr) throw insErr;

        await (supabase as any)
          .from("projects")
          .update({ status: "Client Review" })
          .eq("id", projectId);
      }
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["project-revisions", vars.projectId] });
      qc.invalidateQueries({ queryKey: ["project", vars.projectId] });
      qc.invalidateQueries({ queryKey: ["client-portal"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Revision request submitted to team");
    },
    onError: (error) => notifyError(error, "Could not submit revision request"),
  });
}

export function useResolveRevision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      revisionId,
      projectId,
      status,
      notes,
    }: {
      revisionId: string;
      projectId: string;
      status: "Resolved" | "In Progress" | "Closed";
      notes?: string;
    }) => {
      const { data, error } = await (supabase as any).rpc("resolve_project_revision", {
        _revision_id: revisionId,
        _status: status,
        _notes: notes || null,
      });
      if (error) {
        const { error: updErr } = await (supabase as any)
          .from("project_revisions")
          .update({
            status,
            admin_notes: notes || null,
            resolved_at: status === "Resolved" ? new Date().toISOString() : null,
          })
          .eq("id", revisionId);
        if (updErr) throw updErr;
      }
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["project-revisions", vars.projectId] });
      qc.invalidateQueries({ queryKey: ["project", vars.projectId] });
      qc.invalidateQueries({ queryKey: ["client-portal"] });
      toast.success("Revision updated");
    },
    onError: (error) => notifyError(error, "Could not update revision"),
  });
}
