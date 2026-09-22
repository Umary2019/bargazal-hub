import { useState } from "react";
import {
  Download,
  Plus,
  Trash2,
  Upload,
  CheckSquare,
  Square,
  Clock,
  User,
  Calendar,
  Layers,
  FileCheck2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/format";

export function ProjectDeliveryBoard({ projectId }: { projectId: string }) {
  const queryClient = useQueryClient();

  // Task creation state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<string>("medium");
  const [taskAssignedTo, setTaskAssignedTo] = useState<string>("");
  const [taskDueDate, setTaskDueDate] = useState<string>("");
  const [taskEstHours, setTaskEstHours] = useState<string>("");

  // Milestone creation state
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDueDate, setMilestoneDueDate] = useState("");

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileCategory, setFileCategory] = useState("Deliverable");
  const [fileVersion, setFileVersion] = useState<number>(1);
  const [isDeliverable, setIsDeliverable] = useState(true);
  const [isClientVisible, setIsClientVisible] = useState(true);

  // Staff query for assigning tasks
  const staffQuery = useQuery({
    queryKey: ["assignable-staff"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, job_title")
        .eq("is_active", true);
      if (error) return [];
      return data ?? [];
    },
  });

  // Milestones query
  const milestonesQuery = useQuery({
    queryKey: ["project-milestones", projectId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("project_milestones")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        title: string;
        status: string;
        due_date: string | null;
        completion_percentage?: number | null;
      }>;
    },
  });

  // Tasks query
  const tasksQuery = useQuery({
    queryKey: ["project-tasks", projectId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("project_tasks")
        .select("*, profiles:assigned_to(id, full_name)")
        .eq("project_id", projectId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        title: string;
        status: string;
        priority?: string | null;
        is_completed?: boolean | null;
        due_date: string | null;
        estimated_hours?: number | null;
        actual_hours?: number | null;
        assigned_to?: string | null;
        profiles?: { id: string; full_name: string } | null;
      }>;
    },
  });

  // Files query
  const filesQuery = useQuery({
    queryKey: ["project-files", projectId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("project_files")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        name: string;
        storage_path: string;
        content_type: string | null;
        size_bytes?: number | null;
        category?: string | null;
        version?: number | null;
        is_deliverable?: boolean | null;
        is_client_visible?: boolean | null;
        created_at?: string;
      }>;
    },
  });

  // Add Milestone
  const addMilestone = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("project_milestones").insert({
        project_id: projectId,
        title: milestoneTitle.trim(),
        due_date: milestoneDueDate || null,
        status: "Pending",
        completion_percentage: 0,
        sort_order: (milestonesQuery.data?.length ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMilestoneTitle("");
      setMilestoneDueDate("");
      void queryClient.invalidateQueries({ queryKey: ["project-milestones", projectId] });
      toast.success("Milestone added");
    },
    onError: () => toast.error("Could not add milestone"),
  });

  // Add Task
  const addTask = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).from("project_tasks").insert({
        project_id: projectId,
        title: taskTitle.trim(),
        priority: taskPriority,
        assigned_to: taskAssignedTo || null,
        due_date: taskDueDate || null,
        estimated_hours: taskEstHours ? Number(taskEstHours) : null,
        status: "Todo",
        is_completed: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTaskTitle("");
      setTaskDueDate("");
      setTaskEstHours("");
      setTaskAssignedTo("");
      void queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["staff-workload"] });
      toast.success("Task added");
    },
    onError: () => toast.error("Could not add task"),
  });

  // Update Milestone Status / Percentage
  const updateMilestone = useMutation({
    mutationFn: async ({
      id,
      status,
      percentage,
    }: {
      id: string;
      status?: string;
      percentage?: number;
    }) => {
      const updates: any = {};
      if (status !== undefined) updates.status = status;
      if (percentage !== undefined) {
        updates.completion_percentage = percentage;
        if (percentage === 100) {
          updates.status = "Completed";
          updates.completed_at = new Date().toISOString();
        }
      }
      const { error } = await (supabase as any)
        .from("project_milestones")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["project-milestones", projectId] }),
  });

  // Toggle or Update Task
  const updateTask = useMutation({
    mutationFn: async ({
      id,
      status,
      is_completed,
    }: {
      id: string;
      status?: string;
      is_completed?: boolean;
    }) => {
      const updates: any = {};
      if (status !== undefined) updates.status = status;
      if (is_completed !== undefined) {
        updates.is_completed = is_completed;
        updates.status = is_completed ? "Done" : "In Progress";
        updates.completed_at = is_completed ? new Date().toISOString() : null;
      }
      const { error } = await (supabase as any).from("project_tasks").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["staff-workload"] });
    },
  });

  // Delete item
  const deleteItem = useMutation({
    mutationFn: async ({
      table,
      id,
    }: {
      table: "project_milestones" | "project_tasks";
      id: string;
    }) => {
      const { error } = await supabase
        .from(table as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project-milestones", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["project-tasks", projectId] });
      void queryClient.invalidateQueries({ queryKey: ["staff-workload"] });
    },
  });

  // Upload File / Deliverable
  const uploadFile = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error("Select a file first");
      const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const storagePath = `${projectId}/${crypto.randomUUID()}-${safeName}`;
      const upload = await supabase.storage
        .from("business-files")
        .upload(storagePath, selectedFile, {
          contentType: selectedFile.type || "application/octet-stream",
          upsert: false,
        });
      if (upload.error) throw upload.error;

      const { error } = await (supabase as any).from("project_files").insert({
        project_id: projectId,
        name: selectedFile.name,
        storage_path: storagePath,
        content_type: selectedFile.type || null,
        size_bytes: selectedFile.size,
        category: fileCategory,
        version: Number(fileVersion) || 1,
        is_deliverable: isDeliverable,
        is_client_visible: isClientVisible,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedFile(null);
      setFileVersion((prev) => prev + 1);
      void queryClient.invalidateQueries({ queryKey: ["project-files", projectId] });
      toast.success("File / Deliverable uploaded");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not upload file"),
  });

  // Download File
  async function downloadFile(path: string) {
    const { data, error } = await supabase.storage
      .from("business-files")
      .createSignedUrl(path, 300);
    if (error) {
      toast.error("Could not prepare download");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  // Delete file
  const deleteFile = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("project_files").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["project-files", projectId] });
      toast.success("File removed");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery Plan, Tasks & Deliverables</CardTitle>
        <CardDescription>
          Organize milestones, assign detailed tasks with deadlines, and upload versioned
          deliverables.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Section 1: Milestones */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-2">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Project Milestones ({milestonesQuery.data?.length ?? 0})
            </h3>
          </div>

          {/* Add Milestone Form */}
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Milestone title (e.g. Architecture & Schematics Approval)"
              value={milestoneTitle}
              onChange={(e) => setMilestoneTitle(e.target.value)}
              className="flex-1 min-w-[200px]"
            />
            <Input
              type="date"
              value={milestoneDueDate}
              onChange={(e) => setMilestoneDueDate(e.target.value)}
              className="w-36"
            />
            <Button
              disabled={!milestoneTitle.trim() || addMilestone.isPending}
              onClick={() => addMilestone.mutate()}
            >
              <Plus className="mr-1 h-4 w-4" />
              Milestone
            </Button>
          </div>

          {/* Milestones List */}
          <div className="space-y-2">
            {milestonesQuery.data?.map((m) => {
              const pct = m.completion_percentage ?? 0;
              return (
                <div
                  key={m.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-3 bg-card"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground">{m.title}</span>
                      {m.due_date && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(m.due_date)}
                        </span>
                      )}
                    </div>
                    {/* Progress Bar */}
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-muted h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-mono text-muted-foreground">{pct}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={String(pct)}
                      onValueChange={(val) =>
                        updateMilestone.mutate({ id: m.id, percentage: Number(val) })
                      }
                    >
                      <SelectTrigger className="w-24 h-8 text-xs">
                        <SelectValue placeholder="Progress" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="25">25%</SelectItem>
                        <SelectItem value="50">50%</SelectItem>
                        <SelectItem value="75">75%</SelectItem>
                        <SelectItem value="100">100%</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      value={m.status}
                      onValueChange={(status) => updateMilestone.mutate({ id: m.id, status })}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Pending", "In Progress", "Completed", "Blocked"].map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:bg-red-50"
                      onClick={() => deleteItem.mutate({ table: "project_milestones", id: m.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {milestonesQuery.data?.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No milestones defined yet.</p>
            )}
          </div>
        </section>

        {/* Section 2: Tasks & Action Items */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-2">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-primary" />
              Action Items & Work Breakdown ({tasksQuery.data?.length ?? 0})
            </h3>
          </div>

          {/* Add Task Form */}
          <div className="grid gap-2 sm:grid-cols-5 p-3 rounded-lg border bg-muted/20">
            <Input
              placeholder="Task name / action item..."
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="sm:col-span-2"
            />
            <Select value={taskPriority} onValueChange={setTaskPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={taskAssignedTo} onValueChange={setTaskAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Assign Staff" />
              </SelectTrigger>
              <SelectContent>
                {staffQuery.data?.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
              />
              <Button
                disabled={!taskTitle.trim() || addTask.isPending}
                onClick={() => addTask.mutate()}
                className="shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tasks List */}
          <div className="space-y-2">
            {tasksQuery.data?.map((task) => {
              const isDone = task.is_completed || task.status === "Done";
              const priority = task.priority || "medium";
              return (
                <div
                  key={task.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-3 ${
                    isDone ? "bg-muted/30 opacity-80" : "bg-card"
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3 flex-1">
                    <button
                      type="button"
                      onClick={() => updateTask.mutate({ id: task.id, is_completed: !isDone })}
                      className="mt-0.5 sm:mt-0 text-muted-foreground hover:text-foreground"
                    >
                      {isDone ? (
                        <CheckSquare className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                    <div className="space-y-0.5">
                      <span
                        className={`text-sm font-medium ${
                          isDone ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {task.title}
                      </span>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {priority === "urgent" ? (
                          <Badge className="bg-red-100 text-red-800 text-[10px]">Urgent</Badge>
                        ) : priority === "high" ? (
                          <Badge className="bg-amber-100 text-amber-800 text-[10px]">High</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">
                            {priority}
                          </Badge>
                        )}
                        {task.profiles?.full_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {task.profiles.full_name}
                          </span>
                        )}
                        {task.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Due: {formatDate(task.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Select
                      value={task.status}
                      onValueChange={(status) => updateTask.mutate({ id: task.id, status })}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Todo", "In Progress", "Done", "Blocked"].map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:bg-red-50"
                      onClick={() => deleteItem.mutate({ table: "project_tasks", id: task.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {tasksQuery.data?.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No tasks created yet.</p>
            )}
          </div>
        </section>

        {/* Section 3: Project Files & Versioned Deliverables */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-2">
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              Files & Versioned Deliverables ({filesQuery.data?.length ?? 0})
            </h3>
          </div>

          {/* Upload Deliverable Card */}
          <div className="p-4 rounded-lg border bg-muted/20 space-y-3">
            <div className="grid gap-3 sm:grid-cols-4 items-center">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Choose File
                </label>
                <Input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  className="text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Category
                </label>
                <Select value={fileCategory} onValueChange={setFileCategory}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Deliverable">Client Deliverable</SelectItem>
                    <SelectItem value="Draft / Preview">Draft / Preview</SelectItem>
                    <SelectItem value="Source Code">Source Code / Archive</SelectItem>
                    <SelectItem value="Documentation">Documentation</SelectItem>
                    <SelectItem value="Asset">Asset / Resource</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Version
                </label>
                <Input
                  type="number"
                  min="1"
                  value={fileVersion}
                  onChange={(e) => setFileVersion(Number(e.target.value))}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch checked={isDeliverable} onCheckedChange={setIsDeliverable} />
                  <span className="text-xs font-medium">Official Client Deliverable</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={isClientVisible} onCheckedChange={setIsClientVisible} />
                  <span className="text-xs font-medium">Visible to Client</span>
                </div>
              </div>
              <Button
                disabled={!selectedFile || uploadFile.isPending}
                onClick={() => uploadFile.mutate()}
                size="sm"
                className="gap-1.5"
              >
                <Upload className="w-4 h-4" />
                {uploadFile.isPending ? "Uploading..." : "Upload File"}
              </Button>
            </div>
          </div>

          {/* Files List */}
          <div className="space-y-2">
            {filesQuery.data?.map((file) => (
              <div
                key={file.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-3 bg-card text-xs"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground text-sm truncate max-w-xs">
                      {file.name}
                    </span>
                    {file.version && (
                      <Badge variant="outline" className="font-mono text-[10px]">
                        v{file.version}
                      </Badge>
                    )}
                    {file.category && (
                      <Badge variant="secondary" className="text-[10px]">
                        {file.category}
                      </Badge>
                    )}
                    {file.is_deliverable && (
                      <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">
                        Deliverable
                      </Badge>
                    )}
                    {file.is_client_visible ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                        <Eye className="w-3 h-3" /> Client Visible
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <EyeOff className="w-3 h-3" /> Internal Only
                      </span>
                    )}
                  </div>
                  {file.created_at && (
                    <p className="text-[10px] text-muted-foreground">
                      Uploaded {formatDate(file.created_at)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void downloadFile(file.storage_path)}
                    className="gap-1.5 h-8 text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:bg-red-50"
                    onClick={() => deleteFile.mutate(file.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {filesQuery.data?.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">
                No files or deliverables uploaded.
              </p>
            )}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
