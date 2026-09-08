import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  CircleDot,
  Clock3,
  FolderKanban,
  ListChecks,
  MoreHorizontal,
} from "lucide-react";
import { ProtectedRoute } from "@/components/app/protected-route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/work")({ component: WorkPage });

type AssignedProject = {
  id: string;
  title: string;
  project_number: string;
  status: string;
  progress: number;
  deadline: string | null;
  priority: string;
  clients?: { full_name: string } | null;
  services?: { name: string } | null;
};

type WorkTask = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  project_id: string;
};

type ActivityItem = {
  id: string;
  action: string;
  detail: string | null;
  entity_type: string;
  created_at: string;
};

function WorkPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["assigned-work"],
    queryFn: async () => {
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return { projects: [], tasks: [], activity: [] };
      const [projectResult, activityResult] = await Promise.all([
        (supabase as any)
          .from("projects")
          .select(
            "id, title, project_number, status, progress, deadline, priority, clients(full_name), services(name)",
          )
          .eq("assigned_staff_id", user.id)
          .order("deadline", { ascending: true, nullsFirst: false }),
        supabase
          .from("activity_log")
          .select("id, action, detail, entity_type, created_at")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);
      if (projectResult.error) throw projectResult.error;
      if (activityResult.error) throw activityResult.error;
      const projects = (projectResult.data ?? []) as AssignedProject[];
      const projectIds = projects.map((project) => project.id);
      let tasks: WorkTask[] = [];
      if (projectIds.length > 0) {
        const taskResult = await (supabase as any)
          .from("project_tasks")
          .select("id, title, status, due_date, project_id")
          .in("project_id", projectIds)
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(8);
        if (taskResult.error) throw taskResult.error;
        tasks = (taskResult.data ?? []) as WorkTask[];
      }
      return {
        projects,
        tasks,
        activity: (activityResult.data ?? []) as ActivityItem[],
      };
    },
  });

  const projects = data?.projects ?? [];
  const tasks = data?.tasks ?? [];
  const activity = data?.activity ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const activeProjects = projects.filter(
    (project) => !["Completed", "Cancelled"].includes(project.status),
  );
  const dueSoon = projects.filter(
    (project) => project.deadline && project.deadline <= today && project.status !== "Completed",
  );
  const openTasks = tasks.filter((task) => !["Completed", "Done"].includes(task.status));
  const averageProgress = projects.length
    ? Math.round(
        projects.reduce((total, project) => total + Number(project.progress ?? 0), 0) /
          projects.length,
      )
    : 0;

  return (
    <ProtectedRoute roles={["staff"]}>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Delivery workspace
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">My work</h1>
            <p className="mt-1 text-muted-foreground">
              Your assigned delivery queue, deadlines, and project health.
            </p>
          </div>
          <Button variant="outline" className="gap-2" onClick={() => window.location.reload()}>
            Refresh workspace
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Active projects"
            value={activeProjects.length}
            detail="Currently in delivery"
            icon={<FolderKanban className="h-4 w-4" />}
          />
          <MetricCard
            label="Open tasks"
            value={openTasks.length}
            detail="Across assigned projects"
            icon={<ListChecks className="h-4 w-4" />}
          />
          <MetricCard
            label="Due attention"
            value={dueSoon.length}
            detail="Due today or overdue"
            icon={<AlertTriangle className="h-4 w-4" />}
            tone={dueSoon.length ? "warning" : "default"}
          />
          <MetricCard
            label="Portfolio progress"
            value={`${averageProgress}%`}
            detail="Average completion"
            icon={<CheckCircle2 className="h-4 w-4" />}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(20rem,0.75fr)]">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Assigned projects</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Prioritized by the next deadline
                </p>
              </div>
              <Badge variant="secondary">{projects.length} total</Badge>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="py-8 text-sm text-muted-foreground">Loading delivery queue...</p>
              ) : projects.length === 0 ? (
                <EmptyWorkState />
              ) : (
                <div className="space-y-3">
                  {projects.map((project) => (
                    <ProjectRow key={project.id} project={project} today={today} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Task queue</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Next actions from your projects</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {openTasks.length === 0 ? (
                <p className="py-8 text-sm text-muted-foreground">No open tasks assigned.</p>
              ) : (
                openTasks.slice(0, 6).map((task) => (
                  <div key={task.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{task.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {task.due_date ? `Due ${formatDate(task.due_date)}` : "No due date"}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {task.status}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent workspace activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">No recent activity.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {activity.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm">
                        <span className="font-medium capitalize">{item.action}</span>{" "}
                        {item.detail ?? item.entity_type}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(item.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ReactNode;
  tone?: "default" | "warning";
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className={tone === "warning" ? "text-amber-600" : "text-muted-foreground"}>
            {icon}
          </span>
        </div>
        <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function ProjectRow({ project, today }: { project: AssignedProject; today: string }) {
  const isAtRisk = Boolean(
    project.deadline && project.deadline <= today && project.status !== "Completed",
  );
  return (
    <Link
      to="/projects/$id"
      params={{ id: project.id }}
      className="block rounded-lg border p-4 transition-colors hover:bg-muted/50"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium">{project.title}</p>
            {isAtRisk && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                At risk
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.project_number} · {project.clients?.full_name ?? "Unassigned client"} ·{" "}
            {project.services?.name ?? "General delivery"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{project.status}</Badge>
          <button
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-label="Project actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, Math.max(0, project.progress ?? 0))}%` }}
          />
        </div>
        <span className="w-10 text-right text-xs font-medium">{project.progress ?? 0}%</span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarClock className="h-3.5 w-3.5" />
        {project.deadline ? `Due ${formatDate(project.deadline)}` : "No deadline set"}
        <span className="text-border">•</span>
        <span>{project.priority} priority</span>
      </div>
    </Link>
  );
}

function EmptyWorkState() {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <FolderKanban className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-3 font-medium">No projects assigned yet</p>
      <p className="mt-1 text-sm text-muted-foreground">
        When an administrator assigns work, it will appear here.
      </p>
    </div>
  );
}
