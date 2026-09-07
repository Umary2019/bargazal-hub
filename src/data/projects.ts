import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { notifyError } from "@/lib/errors";
import { logActivity } from "./activity";
import type { Project, ProjectInput, ProjectWithRelations } from "./types";

const KEY = ["projects"] as const;
const SELECT = "*, clients(id, full_name), services(id, name)";

export function useProjects(options?: { clientId?: string | undefined; finalYearOnly?: boolean | undefined }) {
  return useQuery({
    queryKey: [...KEY, options?.clientId ?? "all", options?.finalYearOnly ?? false],
    queryFn: async (): Promise<ProjectWithRelations[]> => {
      let query = supabase
        .from("projects")
        .select(SELECT)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (options?.clientId) query = query.eq("client_id", options.clientId);
      if (options?.finalYearOnly) query = query.eq("is_final_year", true);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ProjectWithRelations[];
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
    mutationFn: async ({ id, values }: { id?: string | undefined; values: ProjectInput }): Promise<Project> => {
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
