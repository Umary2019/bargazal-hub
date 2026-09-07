import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ProtectedRoute } from "@/components/app/protected-route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/work")({ component: WorkPage });
function WorkPage() {
  const { data: projects = [], isLoading } = useQuery({ queryKey: ["assigned-work"], queryFn: async () => { const user = (await supabase.auth.getUser()).data.user; const { data, error } = await (supabase as any).from("projects").select("*, clients(full_name), services(name)").eq("assigned_staff_id", user?.id).order("deadline"); if (error) throw error; return data ?? []; } });
  return <ProtectedRoute><div className="space-y-6"><div><h1 className="text-3xl font-bold tracking-tight">My work</h1><p className="text-muted-foreground">Projects assigned to you for delivery.</p></div><Card><CardHeader><CardTitle>{isLoading ? "Loading..." : `${projects.length} assigned project${projects.length === 1 ? "" : "s"}`}</CardTitle></CardHeader><CardContent className="space-y-3">{projects.length === 0 ? <p className="text-sm text-muted-foreground">No projects have been assigned to you.</p> : projects.map((project: any) => <div key={project.id} className="flex flex-col gap-2 rounded-md border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{project.title}</p><p className="text-sm text-muted-foreground">{project.clients?.full_name ?? "Client"} · {project.services?.name ?? "Service"}</p><p className="text-xs text-muted-foreground">{project.deadline ? `Due ${formatDate(project.deadline)}` : "No deadline"}</p></div><div className="flex items-center gap-3"><span className="text-sm">{project.progress}%</span><Badge variant="outline">{project.status}</Badge></div></div>)}</CardContent></Card></div></ProtectedRoute>;
}
