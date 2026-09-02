import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useClients } from "@/data/clients";
import { useSaveProject } from "@/data/projects";
import type { Project } from "@/data/types";

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project;
}) {
  const { data: clients = [] } = useClients();
  const saveProject = useSaveProject();
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState("");

  useEffect(() => {
    if (!open) return;
    setClientId(project?.client_id ?? "");
    setTitle(project?.title ?? "");
    setBudget(project ? String(project.budget ?? 0) : "");
  }, [open, project]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!clientId || !title.trim() || Number(budget) < 0) return;
    await saveProject.mutateAsync({
      id: project?.id,
      values: {
        client_id: clientId,
        title: title.trim(),
        budget: Number(budget) || 0,
        project_number: project?.project_number ?? "",
      },
    });
    setTitle("");
    setBudget("");
    setClientId("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "New Project"}</DialogTitle>
          <DialogDescription>
            {project
              ? "Update project details and client assignment."
              : "Create a project and link it to a client."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Input
            placeholder="Project title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <Select value={clientId} onValueChange={setClientId} required>
            <SelectTrigger>
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Budget"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
          />
          <DialogFooter>
            <Button type="submit" disabled={saveProject.isPending || !clientId}>
              {saveProject.isPending ? "Saving..." : project ? "Save Changes" : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
