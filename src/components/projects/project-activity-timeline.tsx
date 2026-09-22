import { useQuery } from "@tanstack/react-query";
import {
  Clock,
  MessageSquare,
  Receipt,
  FileCheck,
  RotateCcw,
  Sparkles,
  AlertCircle,
  FolderOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/format";

interface TimelineItem {
  id: string;
  timestamp: string;
  type: "message" | "revision" | "invoice" | "activity";
  title: string;
  detail?: string | null;
  author?: string | null;
  badgeText?: string;
  badgeVariant?: "default" | "outline" | "secondary" | "destructive";
}

export function ProjectActivityTimeline({ projectId }: { projectId: string }) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["project-unified-timeline", projectId],
    queryFn: async (): Promise<TimelineItem[]> => {
      const timeline: TimelineItem[] = [];

      // 1. Project Messages
      const { data: messages } = await supabase
        .from("project_messages" as never)
        .select("id, message, created_at, sender_role, profiles:sender_id(full_name)")
        .eq("project_id", projectId);

      (messages ?? []).forEach((m: any) => {
        timeline.push({
          id: `msg-${m.id}`,
          timestamp: m.created_at,
          type: "message",
          title: "Message Sent",
          detail: m.message,
          author:
            m.profiles?.full_name || (m.sender_role === "staff" ? "Staff Specialist" : "Client"),
          badgeText: m.sender_role,
          badgeVariant: "secondary",
        });
      });

      // 2. Project Revisions
      const { data: revisions } = await supabase
        .from("project_revisions" as never)
        .select("id, reason, status, created_at, feedback")
        .eq("project_id", projectId);

      (revisions ?? []).forEach((r: any) => {
        timeline.push({
          id: `rev-${r.id}`,
          timestamp: r.created_at,
          type: "revision",
          title: `Revision Requested (${r.status})`,
          detail: r.reason,
          badgeText: r.status,
          badgeVariant: r.status === "Approved" ? "default" : "outline",
        });
      });

      // 3. Project Invoices
      const { data: invoices } = await supabase
        .from("invoices")
        .select("id, invoice_number, status, total, amount_paid, created_at")
        .eq("project_id", projectId);

      (invoices ?? []).forEach((inv: any) => {
        timeline.push({
          id: `inv-${inv.id}`,
          timestamp: inv.created_at,
          type: "invoice",
          title: `Invoice #${inv.invoice_number}`,
          detail: `Status: ${inv.status} — Total: ₦${Number(inv.total).toLocaleString()}`,
          badgeText: inv.status,
          badgeVariant: inv.status === "Paid" ? "default" : "outline",
        });
      });

      // 4. Activity Logs
      const { data: activities } = await supabase
        .from("activity_log")
        .select("id, action, detail, created_at")
        .eq("entity_type", "project")
        .eq("entity_id", projectId);

      (activities ?? []).forEach((act) => {
        timeline.push({
          id: `act-${act.id}`,
          timestamp: act.created_at,
          type: "activity",
          title: `Project ${act.action}`,
          detail: act.detail ?? null,
        });
      });

      // Sort chronological descending (newest first)
      return timeline.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );
    },
  });

  function getIcon(type: TimelineItem["type"]) {
    switch (type) {
      case "message":
        return <MessageSquare className="w-4 h-4 text-blue-600" />;
      case "revision":
        return <RotateCcw className="w-4 h-4 text-amber-600" />;
      case "invoice":
        return <Receipt className="w-4 h-4 text-emerald-600" />;
      case "activity":
      default:
        return <Clock className="w-4 h-4 text-primary" />;
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-4 w-4" /> Activity & Delivery Timeline
        </CardTitle>
        <CardDescription>
          Unified chronological timeline of milestones, communications, invoices, and deliverables.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-xs text-muted-foreground py-4">Loading timeline events...</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4">
            No logged activity on this project yet.
          </p>
        ) : (
          <div className="relative pl-6 border-l border-border space-y-6">
            {items.map((item) => (
              <div key={item.id} className="relative group">
                {/* Node dot */}
                <div className="absolute -left-[31px] top-0.5 p-1 rounded-full bg-background border shadow-xs">
                  {getIcon(item.type)}
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{item.title}</span>
                    {item.badgeText && (
                      <Badge variant={item.badgeVariant ?? "outline"} className="text-[10px]">
                        {item.badgeText}
                      </Badge>
                    )}
                    {item.author && <span className="text-muted-foreground">by {item.author}</span>}
                    <span className="text-[10px] text-muted-foreground font-mono ml-auto">
                      {formatDateTime(item.timestamp)}
                    </span>
                  </div>

                  {item.detail && (
                    <p className="text-muted-foreground whitespace-pre-wrap rounded bg-muted/40 p-2 mt-1">
                      {item.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
