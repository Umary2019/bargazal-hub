import { supabase } from "@/integrations/supabase/client";

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error" | "request" | "project" | "invoice" | "payment" | "revision" | "task" | "milestone" | "quote" | "security";
  link?: string | null;
  priority?: "Low" | "Normal" | "High" | "Urgent";
  relatedEntity?: string | null;
  relatedEntityId?: string | null;
}

/**
 * Sends an in-app notification safely, deduplicating identical recent alerts.
 */
export async function sendInAppNotification(payload: NotificationPayload): Promise<string | null> {
  try {
    const { data, error } = await (supabase as any).rpc("create_notification_safe", {
      _user_id: payload.userId,
      _title: payload.title,
      _message: payload.message,
      _type: payload.type || "info",
      _link: payload.link || null,
      _priority: payload.priority || "Normal",
      _related_entity: payload.relatedEntity || null,
      _related_entity_id: payload.relatedEntityId || null,
    });

    if (error) {
      // Fallback: direct insert if RPC not in cache
      const { data: insData, error: insErr } = await (supabase as any)
        .from("notifications")
        .insert({
          user_id: payload.userId,
          title: payload.title,
          message: payload.message,
          type: payload.type || "info",
          link: payload.link || null,
          priority: payload.priority || "Normal",
          related_entity: payload.relatedEntity || null,
          related_entity_id: payload.relatedEntityId || null,
          is_read: false,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insErr) {
        console.warn("Could not insert notification directly:", insErr);
        return null;
      }
      return insData?.id || null;
    }

    return data as string;
  } catch (err) {
    console.warn("sendInAppNotification error:", err);
    return null;
  }
}

/**
 * Notifies all administrative users.
 */
export async function notifyAdmins(
  params: Omit<NotificationPayload, "userId">,
): Promise<void> {
  try {
    const { data: admins } = await (supabase as any)
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (admins && admins.length > 0) {
      await Promise.all(
        admins.map((admin: { id: string }) =>
          sendInAppNotification({
            ...params,
            userId: admin.id,
          }),
        ),
      );
    }
  } catch (err) {
    console.warn("notifyAdmins error:", err);
  }
}

/**
 * Notifies a client by their client_id.
 */
export async function notifyClient(
  clientId: string,
  params: Omit<NotificationPayload, "userId">,
): Promise<void> {
  try {
    const { data: client } = await (supabase as any)
      .from("clients")
      .select("auth_user_id, email")
      .eq("id", clientId)
      .single();

    if (client?.auth_user_id) {
      await sendInAppNotification({
        ...params,
        userId: client.auth_user_id,
      });
    }

    // Also log email dispatch if email is present
    if (client?.email) {
      await logEmailNotification({
        recipient: client.email,
        subject: params.title,
        template: params.type || "transactional",
        metadata: {
          clientId,
          message: params.message,
          link: params.link,
          entity: params.relatedEntity,
          entityId: params.relatedEntityId,
        },
      });
    }
  } catch (err) {
    console.warn("notifyClient error:", err);
  }
}

/**
 * Logs an email notification record into email_logs for delivery tracking and audits.
 */
export async function logEmailNotification(params: {
  recipient: string;
  subject: string;
  template: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await (supabase as any).from("email_logs").insert({
      recipient: params.recipient,
      subject: params.subject,
      template: params.template,
      status: "Sent",
      metadata: params.metadata || {},
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("logEmailNotification error:", err);
  }
}
