import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, FolderOpen, Info, Link2, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProtectedRoute } from "@/components/app/protected-route";
import { ProjectDetailsCard } from "@/components/projects/project-details-card";
import { useProject } from "@/data/projects";
import { useDeleteProject } from "@/data/projects";
import { formatDate } from "@/lib/format";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/projects/$id")({
  component: ProjectDetailPage,
});

function ProjectDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: project, isLoading, error } = useProject(id);
  const [editOpen, setEditOpen] = useState(false);
  const deleteProject = useDeleteProject();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="p-4 text-muted-foreground">Loading project...</div>
      </ProtectedRoute>
    );
  }
  if (error || !project)
    return (
      <ProtectedRoute>
        <div className="space-y-3 p-4">
          <h1 className="text-xl font-semibold">Project unavailable</h1>
          <p className="text-muted-foreground">This project could not be loaded.</p>
          <Button variant="outline" onClick={() => navigate({ to: "/projects" })}>
            Back to projects
          </Button>
        </div>
      </ProtectedRoute>
    );

  return (
    <ProtectedRoute>
      <div className="space-y-6 p-1">
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{project.title}</h1>
            <p className="text-muted-foreground">{project.project_number}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-base px-3 py-1.5">
              {project.status}
            </Badge>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1 h-4 w-4" /> Edit
            </Button>
            <ConfirmDialog
              trigger={
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-1 h-4 w-4" /> Delete
                </Button>
              }
              title="Delete project?"
              description="This will permanently remove the project."
              onConfirm={() =>
                deleteProject.mutate(id, { onSuccess: () => navigate({ to: "/projects" }) })
              }
            />
          </div>
        </div>

        <ProjectDetailsCard project={project} />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-4 w-4" /> Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Client</span>
                <span className="min-w-0 break-words text-right">{project.clients?.full_name ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Institution</span>
                <span className="min-w-0 break-words text-right">{project.institution ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Department</span>
                <span className="min-w-0 break-words text-right">{project.department ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Program</span>
                <span className="min-w-0 break-words text-right">{project.programme ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Start Date</span>
                <span>{project.start_date ? formatDate(project.start_date) : "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Deadline</span>
                <span>{project.deadline ? formatDate(project.deadline) : "—"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-4 w-4" /> Links & Deliverables
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">GitHub</span>
                {project.github_url ? (
                  <a
                    href={project.github_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    Open <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span>—</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Demo</span>
                {project.demo_url ? (
                  <a
                    href={project.demo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    Open <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <span>—</span>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Supervisor</span>
                <span className="min-w-0 break-words text-right">{project.supervisor ?? "—"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {project.description && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4" /> Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {project.description}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      <ProjectFormDialog open={editOpen} onOpenChange={setEditOpen} project={project} />
    </ProtectedRoute>
  );
}
