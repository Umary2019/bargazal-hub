import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus,
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  Pencil,
  Phone,
  Mail,
  ShieldAlert,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { ProtectedRoute } from "@/components/app/protected-route";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useCreateStaff } from "@/data/staff";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/staff")({ component: StaffPage });

function StaffPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const createStaff = useCreateStaff();
  const [createOpen, setCreateOpen] = useState(false);
  const [staffForm, setStaffForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    position: "Technical Specialist",
  });

  // Edit Staff Profile dialog
  const [editMember, setEditMember] = useState<any | null>(null);
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editSpecialization, setEditSpecialization] = useState("");
  const [editSkills, setEditSkills] = useState("");
  const [editAvailability, setEditAvailability] = useState("available");
  const [editPhone, setEditPhone] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Fetch Staff Profiles
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["staff-management"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "staff");
      if (rolesError) throw rolesError;
      const ids = (roles ?? []).map((role) => role.user_id);
      if (ids.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("*")
        .in("id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch Workload Metrics: Projects & Tasks
  const { data: workload = { projectsByStaff: {}, tasksByStaff: {} } } = useQuery({
    queryKey: ["staff-workload"],
    enabled: isAdmin,
    queryFn: async () => {
      // 1. Projects
      const { data: projectsData, error: projError } = await supabase
        .from("projects")
        .select("id, assigned_staff_id, status");
      if (projError) throw projError;

      const projectsByStaff: Record<string, { active: number; completed: number }> = {};
      (projectsData ?? []).forEach((p: any) => {
        const staffId = p.assigned_staff_id;
        if (!staffId) return;
        const entry = projectsByStaff[staffId] ?? { active: 0, completed: 0 };
        if (p.status === "Completed") {
          entry.completed++;
        } else {
          entry.active++;
        }
        projectsByStaff[staffId] = entry;
      });

      // 2. Project Tasks
      const { data: tasksData, error: taskError } = await (supabase as any)
        .from("project_tasks")
        .select("id, assigned_to, is_completed, due_date");
      if (taskError) throw taskError;

      const now = new Date();
      const tasksByStaff: Record<
        string,
        { pending: number; completed: number; overdue: number }
      > = {};

      (tasksData ?? []).forEach((t: any) => {
        const staffId = t.assigned_to;
        if (!staffId) return;
        const entry = tasksByStaff[staffId] ?? { pending: 0, completed: 0, overdue: 0 };
        if (t.is_completed) {
          entry.completed++;
        } else {
          entry.pending++;
          if (t.due_date && new Date(t.due_date) < now) {
            entry.overdue++;
          }
        }
        tasksByStaff[staffId] = entry;
      });

      return { projectsByStaff, tasksByStaff };
    },
  });

  async function handleCreateStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!staffForm.email || !staffForm.full_name) {
      toast.error("Name and email are required");
      return;
    }
    try {
      await createStaff.mutateAsync(staffForm);
      setStaffForm({
        full_name: "",
        email: "",
        password: "",
        phone: "",
        position: "Technical Specialist",
      });
      setCreateOpen(false);
    } catch {
      // Error handled by mutation
    }
  }

  async function updateStaff(userId: string, action: "approve" | "active" | "inactive") {
    const rpc = action === "approve" ? "approve_staff" : "set_staff_active";
    const { error } = await (supabase as any).rpc(rpc, {
      _user_id: userId,
      ...(action === "approve" ? { _approved: true } : { _active: action === "active" }),
    });
    if (error) toast.error(error.message);
    else {
      toast.success(action === "approve" ? "Staff member approved" : `Staff member ${action}`);
      void queryClient.invalidateQueries({ queryKey: ["staff-management"] });
    }
  }

  function openEditStaff(member: any) {
    setEditMember(member);
    setEditJobTitle(member.job_title || "");
    setEditSpecialization(member.specialization || "");
    setEditSkills(Array.isArray(member.skills) ? member.skills.join(", ") : "");
    setEditAvailability(member.availability || "available");
    setEditPhone(member.phone || "");
  }

  async function handleSaveStaffEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editMember) return;
    setIsSavingEdit(true);
    try {
      const skillsArray = editSkills
        ? editSkills.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          job_title: editJobTitle.trim() || null,
          specialization: editSpecialization.trim() || null,
          skills: skillsArray,
          availability: editAvailability,
          phone: editPhone.trim() || null,
        })
        .eq("id", editMember.id);

      if (error) throw error;
      toast.success("Staff details updated");
      setEditMember(null);
      void queryClient.invalidateQueries({ queryKey: ["staff-management"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update staff");
    } finally {
      setIsSavingEdit(false);
    }
  }

  return (
    <ProtectedRoute>
      {isAdmin ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Team & Resources
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight">Staff Management</h1>
              <p className="mt-1 text-muted-foreground">
                Monitor staff workloads, availability, specializations, and project assignments.
              </p>
            </div>
            <Button className="gap-2" onClick={() => setCreateOpen(true)}>
              <UserPlus className="h-4 w-4" /> Add Staff Member
            </Button>
          </div>

          {/* Workload Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Total Team
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{staff.length}</div>
                <p className="text-xs text-muted-foreground mt-0.5">Authorized staff accounts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Available for Work
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {
                    staff.filter(
                      (s: any) => (s.availability || "available") === "available" && s.is_active !== false
                    ).length
                  }
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Ready for project tasks</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Assigned Active Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {Object.values(workload.projectsByStaff).reduce(
                    (sum, p) => sum + (p.active || 0),
                    0
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Projects currently in progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Pending Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {Object.values(workload.tasksByStaff).reduce(
                    (sum, t) => sum + (t.pending || 0),
                    0
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Tasks assigned across staff</p>
              </CardContent>
            </Card>
          </div>

          {/* Staff Directory Table / Cards */}
          <Card>
            <CardHeader>
              <CardTitle>Staff Directory & Workloads</CardTitle>
              <CardDescription>{staff.length} staff member(s)</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground py-4">Loading staff directory...</p>
              ) : staff.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No staff accounts found.</p>
              ) : (
                <div className="divide-y">
                  {staff.map((member: any) => {
                    const memberProjects = workload.projectsByStaff[member.id] || {
                      active: 0,
                      completed: 0,
                    };
                    const memberTasks = workload.tasksByStaff[member.id] || {
                      pending: 0,
                      completed: 0,
                      overdue: 0,
                    };
                    const availability = member.availability || "available";

                    return (
                      <div
                        key={member.id}
                        className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 py-5"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-foreground text-base">
                              {member.full_name ?? "Unnamed staff"}
                            </span>
                            <Badge variant="outline" className="font-mono text-xs">
                              {member.job_title ?? "Staff"}
                            </Badge>

                            {/* Availability Badge */}
                            {availability === "available" ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                                Available
                              </Badge>
                            ) : availability === "busy" ? (
                              <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                High Workload
                              </Badge>
                            ) : (
                              <Badge variant="secondary">On Leave</Badge>
                            )}

                            <Badge
                              variant={
                                member.approval_status === "Approved" ? "default" : "outline"
                              }
                            >
                              {member.is_active === false ? "Inactive" : member.approval_status}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {member.email}
                            </span>
                            {member.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {member.phone}
                              </span>
                            )}
                            {member.specialization && (
                              <span className="flex items-center gap-1 font-medium text-foreground">
                                <Briefcase className="w-3 h-3 text-primary" />
                                {member.specialization}
                              </span>
                            )}
                          </div>

                          {/* Skills Pills */}
                          {Array.isArray(member.skills) && member.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {member.skills.map((skill: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Workload Metrics & Actions */}
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-3 text-xs bg-muted/60 p-2.5 rounded-lg border">
                            <div className="text-center">
                              <span className="block font-bold text-sm text-foreground">
                                {memberProjects.active}
                              </span>
                              <span className="text-muted-foreground">Projects</span>
                            </div>
                            <div className="h-6 w-px bg-border" />
                            <div className="text-center">
                              <span className="block font-bold text-sm text-amber-600">
                                {memberTasks.pending}
                              </span>
                              <span className="text-muted-foreground">Tasks Due</span>
                            </div>
                            <div className="h-6 w-px bg-border" />
                            <div className="text-center">
                              <span className="block font-bold text-sm text-emerald-600">
                                {memberTasks.completed}
                              </span>
                              <span className="text-muted-foreground">Done</span>
                            </div>
                            {memberTasks.overdue > 0 && (
                              <>
                                <div className="h-6 w-px bg-border" />
                                <div className="text-center text-red-600 font-semibold">
                                  <span className="block text-sm">{memberTasks.overdue}</span>
                                  <span>Overdue</span>
                                </div>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditStaff(member)}
                              title="Edit staff profile"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            {member.approval_status !== "Approved" && (
                              <Button size="sm" onClick={() => updateStaff(member.id, "approve")}>
                                Approve
                              </Button>
                            )}

                            {member.approval_status === "Approved" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updateStaff(
                                    member.id,
                                    member.is_active ? "inactive" : "active"
                                  )
                                }
                              >
                                {member.is_active ? "Deactivate" : "Reactivate"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Staff Profile Dialog */}
          <Dialog open={Boolean(editMember)} onOpenChange={(open) => !open && setEditMember(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Staff Details</DialogTitle>
                <DialogDescription>
                  Update role, specialization, skills, and availability for {editMember?.full_name}.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveStaffEdit} className="space-y-4 py-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Job Title / Role
                  </label>
                  <Input
                    value={editJobTitle}
                    onChange={(e) => setEditJobTitle(e.target.value)}
                    placeholder="e.g. Senior Full-Stack Engineer"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Specialization
                  </label>
                  <Input
                    value={editSpecialization}
                    onChange={(e) => setEditSpecialization(e.target.value)}
                    placeholder="e.g. Embedded Systems / Flutter / AI"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">
                    Skills (comma-separated)
                  </label>
                  <Input
                    value={editSkills}
                    onChange={(e) => setEditSkills(e.target.value)}
                    placeholder="React, Python, Arduino, PCB Design"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Availability Status
                    </label>
                    <Select value={editAvailability} onValueChange={setEditAvailability}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="busy">High Workload</SelectItem>
                        <SelectItem value="on_leave">On Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Phone Number
                    </label>
                    <Input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="08012345678"
                    />
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditMember(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSavingEdit}>
                    {isSavingEdit ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Add Staff Account Dialog */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent className="sm:max-w-md">
              <form onSubmit={handleCreateStaff}>
                <DialogHeader>
                  <DialogTitle>Add Staff Member</DialogTitle>
                  <DialogDescription>
                    Create a new staff account with immediate login authorization.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-4 text-sm">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Full Name</label>
                    <Input
                      required
                      placeholder="e.g. Ibrahim Abubakar"
                      value={staffForm.full_name}
                      onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Email Address</label>
                    <Input
                      required
                      type="email"
                      placeholder="staff@bargazal.com"
                      value={staffForm.email}
                      onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Job Title / Role</label>
                    <Input
                      placeholder="e.g. Lead Software Engineer"
                      value={staffForm.position}
                      onChange={(e) => setStaffForm({ ...staffForm, position: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Phone Number</label>
                    <Input
                      placeholder="e.g. 08012345678"
                      value={staffForm.phone}
                      onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Temporary Password</label>
                    <Input
                      type="password"
                      placeholder="Default: BargazalStaff@2026"
                      value={staffForm.password}
                      onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createStaff.isPending}>
                    {createStaff.isPending ? "Creating..." : "Create Account"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>My work</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Projects assigned to you appear in the My Work area.
            </p>
          </CardContent>
        </Card>
      )}
    </ProtectedRoute>
  );
}
