import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  // project status
  Pending: "bg-muted text-muted-foreground",
  Planning: "bg-info/15 text-info",
  Requirements: "bg-info/15 text-info",
  Design: "bg-info/15 text-info",
  Development: "bg-warning/20 text-warning-foreground",
  Testing: "bg-warning/20 text-warning-foreground",
  "Client Review": "bg-accent/25 text-accent-foreground",
  Completed: "bg-success/15 text-success",
  Cancelled: "bg-destructive/15 text-destructive",
  // invoice status
  Draft: "bg-muted text-muted-foreground",
  Sent: "bg-info/15 text-info",
  "Partially Paid": "bg-warning/20 text-warning-foreground",
  Paid: "bg-success/15 text-success",
  Overdue: "bg-destructive/15 text-destructive",
  // priority
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-info/15 text-info",
  High: "bg-warning/20 text-warning-foreground",
  Urgent: "bg-destructive/15 text-destructive",
  // service status
  Active: "bg-success/15 text-success",
  Inactive: "bg-muted text-muted-foreground",
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONES[value] ?? "bg-secondary text-secondary-foreground",
        className,
      )}
    >
      {value}
    </span>
  );
}
