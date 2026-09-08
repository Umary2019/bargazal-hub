import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ProjectWithRelations } from "@/data/types";

export function ProjectDetailsCard({ project }: { project: ProjectWithRelations }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(project.budget)}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Paid</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-emerald-600">
            {formatCurrency(project.amount_paid)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">
            {formatCurrency(project.balance ?? 0)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>{project.progress}%</span>
              <Badge variant="outline">{project.status}</Badge>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200">
              <div
                className="h-2 rounded-full bg-blue-600"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Project Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex justify-between gap-4">
            <span className="font-medium text-foreground">Client</span>
            <span>{project.clients?.full_name ?? "—"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="font-medium text-foreground">Service</span>
            <span>{project.services?.name ?? "—"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="font-medium text-foreground">Deadline</span>
            <span>{project.deadline ? formatDate(project.deadline) : "—"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="font-medium text-foreground">Priority</span>
            <span>{project.priority}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
