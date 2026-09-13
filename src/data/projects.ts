import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { notifyError } from "@/lib/errors";
import { logActivity } from "./activity";
import type { Project, ProjectInput, ProjectWithRelations } from "./types";
import { fetchAllPages } from "@/lib/paginate";

const KEY = ["projects"] as const;
const SELECT = "*, clients(id, full_name), services(id, name)";

export function useProjects(options?: {
  clientId?: string | undefined;
  finalYearOnly?: boolean | undefined;
}) {
  return useQuery({
    queryKey: [...KEY, options?.clientId ?? "all", options?.finalYearOnly ?? false],
    queryFn: async (): Promise<ProjectWithRelations[]> => {
      const rows = await fetchAllPages((from, to) => {
        let query = supabase
          .from("projects")
          .select(SELECT)
          .order("created_at", { ascending: false })
          .range(from, to);
        if (options?.clientId) query = query.eq("client_id", options.clientId);
        if (options?.finalYearOnly) query = query.eq("is_final_year", true);
        return query;
      });
      return rows as ProjectWithRelations[];
    },
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["project", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<ProjectWithRelations> => {
      const { data, error } = await supabase.from("projects").select(SELECT).eq("id", id!).single();
      if (error) throw error;
      return data as ProjectWithRelations;
    },
  });
}

export function useSaveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id?: string | undefined;
      values: ProjectInput;
    }): Promise<Project> => {
      if (id) {
        const { data, error } = await supabase
          .from("projects")
          .update(values)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        await logActivity("project", data.id, "updated", data.title);
        return data;
      }
      const { data, error } = await supabase
        .from("projects")
        .insert({ ...values, project_number: "" })
        .select()
        .single();
      if (error) throw error;
      await logActivity("project", data.id, "created", data.title);
      return data;
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["project", data.id] });
      qc.invalidateQueries({ queryKey: ["assigned-work"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      toast.success(variables.id ? "Project updated successfully" : "Project created successfully");
    },
    onError: (error) => notifyError(error, "Could not save project"),
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Project deleted");
    },
    onError: (error) => notifyError(error, "Could not delete project"),
  });
}

export function useProjectFiles(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project-files", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_files" as never)
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        project_id: string;
        name: string;
        storage_path: string;
        content_type: string | null;
        size_bytes: number | null;
        created_at: string;
      }>;
    },
  });
}

export function useAcceptDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, feedback }: { projectId: string; feedback?: string }) => {
      const { data, error } = await (supabase as any).rpc("accept_project_delivery", {
        _project_id: projectId,
        _feedback: feedback || null,
      });
      if (error) {
        // Fallback: direct update if RPC is missing
        const { error: updateError } = await (supabase as any)
          .from("projects")
          .update({ status: "Completed", progress: 100, updated_at: new Date().toISOString() })
          .eq("id", projectId);
        if (updateError) throw updateError;
      }
      return data;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["project", variables.projectId] });
      qc.invalidateQueries({ queryKey: ["client-portal"] });
      qc.invalidateQueries({ queryKey: ["assigned-work"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Project delivery approved! Work marked as completed.");
    },
    onError: (error) => notifyError(error, "Could not approve project delivery"),
  });
}
