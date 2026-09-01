import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/** Best-effort audit trail. Never blocks the main operation. */
export async function logActivity(
  entityType: string,
  entityId: string | null,
  action: string,
  detail?: string,
): Promise<void> {
  try {
    const { data } = await supabase.auth.getUser();
    await supabase.from("activity_log").insert({
      entity_type: entityType,
      entity_id: entityId,
      action,
      detail: detail ?? null,
      actor_id: data.user?.id ?? null,
    });
  } catch (error) {
    console.warn("activity log skipped", error);
  }
}

export function useActivity(entityType?: string, entityId?: string) {
  return useQuery({
    queryKey: ["activity", entityType ?? "all", entityId ?? "all"],
    queryFn: async () => {
      let query = supabase
        .from("activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (entityType) query = query.eq("entity_type", entityType);
      if (entityId) query = query.eq("entity_id", entityId);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}
