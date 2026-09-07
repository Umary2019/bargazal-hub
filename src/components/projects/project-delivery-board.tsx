import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ProjectDeliveryBoard({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const milestonesQuery = useQuery({
    queryKey: ["project-milestones", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_milestones" as never)
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; title: string; status: string; due_date: string | null }>;
    },
  });
  const tasksQuery = useQuery({
    queryKey: ["project-tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_tasks" as never)
        .select("*")
        .eq("project_id", projectId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; title: string; status: string; due_date: string | null }>;
    },
  });
  const addMilestone = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("project_milestones" as never).insert({ project_id: projectId, title: title.trim() } as never);
      if (error) throw error;
    },
    onSuccess: () => { setTitle(""); void queryClient.invalidateQueries({ queryKey: ["project-milestones", projectId] }); toast.success("Milestone added"); },
    onError: () => toast.error("Could not add milestone"),
  });
  const addTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("project_tasks" as never).insert({ project_id: projectId, title: taskTitle.trim() } as never);
      if (error) throw error;
    },
    onSuccess: () => { setTaskTitle(""); void queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] }); toast.success("Task added"); },
    onError: () => toast.error("Could not add task"),
  });
  const updateMilestone = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("project_milestones" as never).update({ status } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["project-milestones", projectId] }),
  });
  const updateTask = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("project_tasks" as never).update({ status } as never).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] }),
  });
  const deleteItem = useMutation({
    mutationFn: async ({ table, id }: { table: "project_milestones" | "project_tasks"; id: string }) => {
      const { error } = await supabase.from(table as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project-milestones", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
    },
  });

  return (
    <Card>
      <CardHeader><CardTitle>Delivery plan</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex gap-2"><Input placeholder="New milestone" value={title} onChange={(event) => setTitle(event.target.value)} /><Button disabled={!title.trim() || addMilestone.isPending} onClick={() => addMilestone.mutate()}><Plus className="mr-1 h-4 w-4" />Milestone</Button></div>
          <div className="flex gap-2"><Input placeholder="New task" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} /><Button disabled={!taskTitle.trim() || addTask.isPending} onClick={() => addTask.mutate()}><Plus className="mr-1 h-4 w-4" />Task</Button></div>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-2"><h3 className="font-semibold">Milestones</h3>{milestonesQuery.data?.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-md border p-3"><span className="min-w-0 flex-1">{item.title}</span><Select value={item.status} onValueChange={(status) => updateMilestone.mutate({ id: item.id, status })}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent>{["Pending", "In Progress", "Completed", "Blocked"].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select><Button variant="ghost" size="icon" aria-label="Delete milestone" onClick={() => deleteItem.mutate({ table: "project_milestones", id: item.id })}><Trash2 className="h-4 w-4 text-red-600" /></Button></div>)}</section>
          <section className="space-y-2"><h3 className="font-semibold">Tasks</h3>{tasksQuery.data?.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-md border p-3"><span className="min-w-0 flex-1">{item.title}</span><Select value={item.status} onValueChange={(status) => updateTask.mutate({ id: item.id, status })}><SelectTrigger className="w-28"><SelectValue /></SelectTrigger><SelectContent>{["Todo", "In Progress", "Done", "Blocked"].map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent></Select><Button variant="ghost" size="icon" aria-label="Delete task" onClick={() => deleteItem.mutate({ table: "project_tasks", id: item.id })}><Trash2 className="h-4 w-4 text-red-600" /></Button></div>)}</section>
        </div>
      </CardContent>
    </Card>
  );
}
