import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Search, MoreVertical } from "lucide-react";

import { ProtectedRoute } from "@/components/app/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/data/projects";
import { formatCurrency } from "@/lib/format";
import { Link } from "@tanstack/react-router";
import { ProjectFormDialog } from "@/components/projects/project-form-dialog";

export const Route = createFileRoute("/projects")({
  component: ProjectsPage,
});

function ProjectsPage() {
  const location = useLocation();
  return location.pathname !== "/projects" ? <Outlet /> : <ProjectsCollection />;
}

function ProjectsCollection() {
  const { data: projects = [], isLoading } = useProjects();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.project_number?.includes(searchTerm) ?? false);
    const matchesStatus = !statusFilter || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statuses = Array.from(new Set(projects.map((p) => p.status)));

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Development":
      case "Testing":
        return "bg-blue-100 text-blue-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground">Manage client projects and track progress</p>
          </div>
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or project number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select
                value={statusFilter || "all"}
                onValueChange={(v) => setStatusFilter(v === "all" ? null : v)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Projects Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Projects</CardTitle>
            <CardDescription>{filteredProjects.length} project(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-slate-200 rounded animate-pulse" />
                ))}
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No projects found</p>
                <Button variant="outline" className="mt-4" onClick={() => setDialogOpen(true)}>
                  Create Your First Project
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project Number</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProjects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell className="font-mono text-sm">
                          {project.project_number}
                        </TableCell>
                        <TableCell className="font-medium">
                          <Link
                            to="/projects/$id"
                            params={{ id: project.id }}
                            className="hover:underline"
                          >
                            {project.title}
                          </Link>
                        </TableCell>
                        <TableCell>{project.clients?.full_name || "-"}</TableCell>
                        <TableCell>{formatCurrency(project.budget)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${project.progress}%` }}
                              />
                            </div>
                            <span className="text-sm">{project.progress}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(project.status)}>{project.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link to="/projects/$id" params={{ id: project.id }}>
                            <Button variant="ghost" size="sm" aria-label={`View ${project.title}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <ProjectFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </ProtectedRoute>
  );
}
