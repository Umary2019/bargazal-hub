import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { notifyError } from "@/lib/errors";
import { logActivity } from "./activity";
import type { Client, ClientInput } from "./types";
import { fetchAllPages } from "@/lib/paginate";

const KEY = ["clients"] as const;

export function useClients() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Client[]> => {
      return fetchAllPages((from, to) =>
        supabase
          .from("clients")
          .select("*")
          .order("created_at", { ascending: false })
          .range(from, to),
      );
    },
  });
}

export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: ["client", id],
    enabled: Boolean(id),
    queryFn: async (): Promise<Client> => {
      const { data, error } = await supabase.from("clients").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string | undefined; values: ClientInput }) => {
      if (id) {
        const { data, error } = await supabase
          .from("clients")
          .update(values)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        await logActivity("client", data.id, "updated", data.full_name);
        return data;
      }
      const { data, error } = await supabase.from("clients").insert(values).select().single();
      if (error) throw error;
      await logActivity("client", data.id, "created", data.full_name);
      return data;
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["client", data.id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      toast.success(variables.id ? "Client updated successfully" : "Client created successfully");
    },
    onError: (error) => notifyError(error, "Could not save client"),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
      await logActivity("client", id, "deleted");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Client deleted");
    },
    onError: (error) => notifyError(error, "Could not delete client"),
  });
}

export function useArchiveClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("clients")
        .update({ archived_at: new Date().toISOString(), status: "archived" } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await logActivity("client", id, "archived", data.full_name);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Client archived");
    },
    onError: (error) => notifyError(error, "Could not archive client"),
  });
}

export function useRestoreClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from("clients")
        .update({ archived_at: null, status: "active" } as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      await logActivity("client", id, "restored", data.full_name);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Client restored");
    },
    onError: (error) => notifyError(error, "Could not restore client"),
  });
}

export function useBulkDeleteClients() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("clients").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`${ids.length} client(s) deleted`);
    },
    onError: (error) => notifyError(error, "Could not delete selected clients"),
  });
}

export function useBulkUpdateClientStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase
        .from("clients")
        .update({ status } as any)
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success(`Updated ${variables.ids.length} client(s) to ${variables.status}`);
    },
    onError: (error) => notifyError(error, "Could not update client status"),
  });
}

export function useImportClients() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (newClients: ClientInput[]) => {
      const { data, error } = await supabase.from("clients").insert(newClients).select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success(`Successfully imported ${data.length} client(s)`);
    },
    onError: (error) => notifyError(error, "Failed to import clients"),
  });
}
