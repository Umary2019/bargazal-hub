import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useServices } from "@/data/services";
import type { Project } from "@/data/types";
import type { Database } from "@/integrations/supabase/types";

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
  const { data: services = [] } = useServices();
  const saveProject = useSaveProject();
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [budget, setBudget] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [status, setStatus] = useState<Database["public"]["Enums"]["project_status"]>("Pending");
  const [priority, setPriority] =
    useState<Database["public"]["Enums"]["project_priority"]>("Medium");
  const [progress, setProgress] = useState("0");
  const [institution, setInstitution] = useState("");
  const [department, setDepartment] = useState("");
  const [programme, setProgramme] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [techStack, setTechStack] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!open) return;
    setClientId(project?.client_id ?? "");
    setTitle(project?.title ?? "");
    setBudget(project ? String(project.budget ?? 0) : "");
    setServiceId(project?.service_id ?? "");
    setStatus(project?.status ?? "Pending");
    setPriority(project?.priority ?? "Medium");
    setProgress(String(project?.progress ?? 0));
    setInstitution(project?.institution ?? "");
    setDepartment(project?.department ?? "");
    setProgramme(project?.programme ?? "");
    setStartDate(project?.start_date ?? "");
    setDeadline(project?.deadline ?? "");
    setGithubUrl(project?.github_url ?? "");
    setDemoUrl(project?.demo_url ?? "");
    setSupervisor(project?.supervisor ?? "");
    setDescription(project?.description ?? "");
    setRequirements(project?.requirements ?? "");
    setTechStack(project?.tech_stack ?? "");
    setNotes(project?.notes ?? "");
  }, [open, project]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const total = Number(budget) || 0;
    const currentProgress = Math.min(Math.max(Number(progress) || 0, 0), 100);
    if (!clientId || !title.trim() || total < 0) return;
    await saveProject.mutateAsync({
      id: project?.id,
      values: {
        client_id: clientId,
        title: title.trim(),
        budget: Number(budget) || 0,
        project_number: project?.project_number ?? "",
        service_id: serviceId || null,
        status,
        priority,
        progress: currentProgress,
        institution: institution.trim() || null,
        department: department.trim() || null,
        programme: programme.trim() || null,
        start_date: startDate || null,
        deadline: deadline || null,
        github_url: githubUrl.trim() || null,
        demo_url: demoUrl.trim() || null,
        supervisor: supervisor.trim() || null,
        description: description.trim() || null,
        requirements: requirements.trim() || null,
        tech_stack: techStack.trim() || null,
        notes: notes.trim() || null,
      },
    });
    setTitle("");
    setBudget("");
    setClientId("");
    setServiceId("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "New Project"}</DialogTitle>
          <DialogDescription>
            {project
              ? "Update project details and client assignment."
              : "Create a project and link it to a client."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 pr-1">
          <Input
            aria-label="Project title"
            placeholder="Project title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
          <Select value={clientId} onValueChange={setClientId} required>
            <SelectTrigger aria-label="Client">
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
          <Select value={serviceId} onValueChange={setServiceId}>
            <SelectTrigger aria-label="Service">
              <SelectValue placeholder="Select service (optional)" />
            </SelectTrigger>
            <SelectContent>
              {services.map((service) => (
                <SelectItem key={service.id} value={service.id}>
                  {service.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
              <SelectTrigger aria-label="Project status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {["Pending", "Development", "Testing", "Completed", "Cancelled"].map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={priority}
              onValueChange={(value) => setPriority(value as typeof priority)}
            >
              <SelectTrigger aria-label="Project priority">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                {["Low", "Medium", "High", "Urgent"].map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            aria-label="Progress percentage"
            type="number"
            min="0"
            max="100"
            placeholder="Progress (%)"
            value={progress}
            onChange={(event) => setProgress(event.target.value)}
          />
          <Input
            aria-label="Budget"
            type="number"
            min="0"
            step="0.01"
            placeholder="Budget"
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Total budget</div>
              <div className="mt-1 font-semibold">₦{Number(budget || 0).toLocaleString()}</div>
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-xs text-muted-foreground">Remaining balance</div>
              <div className="mt-1 font-semibold">Payment records determine this balance.</div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Institution"
              value={institution}
              onChange={(event) => setInstitution(event.target.value)}
            />
            <Input
              placeholder="Department"
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
            />
            <Input
              placeholder="Programme"
              value={programme}
              onChange={(event) => setProgramme(event.target.value)}
            />
            <Input
              placeholder="Supervisor"
              value={supervisor}
              onChange={(event) => setSupervisor(event.target.value)}
            />
            <Input
              type="date"
              aria-label="Start date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
            <Input
              type="date"
              aria-label="Deadline"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
            <Input
              placeholder="GitHub URL"
              type="url"
              value={githubUrl}
              onChange={(event) => setGithubUrl(event.target.value)}
            />
            <Input
              placeholder="Demo URL"
              type="url"
              value={demoUrl}
              onChange={(event) => setDemoUrl(event.target.value)}
            />
          </div>
          <Textarea
            placeholder="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <Textarea
            placeholder="Requirements"
            value={requirements}
            onChange={(event) => setRequirements(event.target.value)}
          />
          <Textarea
            placeholder="Tech stack"
            value={techStack}
            onChange={(event) => setTechStack(event.target.value)}
          />
          <Textarea
            placeholder="Notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
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
