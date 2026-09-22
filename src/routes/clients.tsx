import { createFileRoute, Outlet, useLocation, Link } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Pencil,
  Plus,
  Search,
  Trash2,
  Download,
  Upload,
  Archive,
  RefreshCw,
  CheckSquare,
  Square,
  Users,
  Building2,
  Mail,
  Phone,
  Tag,
  ShieldCheck,
} from "lucide-react";

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
  useClients,
  useDeleteClient,
  useArchiveClient,
  useRestoreClient,
  useBulkDeleteClients,
  useBulkUpdateClientStatus,
  useImportClients,
} from "@/data/clients";
import { ClientFormDialog } from "@/components/clients/client-form-dialog";
import { ConfirmDialog } from "@/components/app/confirm-dialog";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv, parseCsv } from "@/lib/csv";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/clients")({
  component: ClientsPage,
});

function ClientsPage() {
  const location = useLocation();
  return location.pathname !== "/clients" ? <Outlet /> : <ClientsCollection />;
}

function ClientsCollection() {
  const { data: clients = [], isLoading } = useClients();
  const deleteClient = useDeleteClient();
  const archiveClient = useArchiveClient();
  const restoreClient = useRestoreClient();
  const bulkDeleteClients = useBulkDeleteClients();
  const bulkUpdateStatus = useBulkUpdateClientStatus();
  const importClientsMutation = useImportClients();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "archived">(
    "all",
  );
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | undefined>();
  const [promoteId, setPromoteId] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState("Staff");

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // CSV Import state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importText, setImportText] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Filter clients
  const filteredClients = useMemo(() => {
    return clients.filter((client: any) => {
      // Status filter
      if (statusFilter === "archived") {
        if (!client.archived_at && client.status !== "archived") return false;
      } else if (statusFilter === "active") {
        if (client.archived_at || client.status === "inactive" || client.status === "archived")
          return false;
      } else if (statusFilter === "inactive") {
        if (client.archived_at || client.status !== "inactive") return false;
      } else {
        // "all" excludes archived unless specifically requested
        if (client.archived_at || client.status === "archived") return false;
      }

      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      const nameMatch = client.full_name?.toLowerCase().includes(q) ?? false;
      const emailMatch = client.email?.toLowerCase().includes(q) ?? false;
      const phoneMatch = client.phone?.includes(q) ?? false;
      const instMatch = client.institution?.toLowerCase().includes(q) ?? false;
      const tagsMatch =
        Array.isArray(client.tags) && client.tags.some((t: string) => t.toLowerCase().includes(q));
      const sourceMatch = client.acquisition_source?.toLowerCase().includes(q) ?? false;
      return nameMatch || emailMatch || phoneMatch || instMatch || tagsMatch || sourceMatch;
    });
  }, [clients, statusFilter, searchTerm]);

  // Handle select all
  const allFilteredSelected =
    filteredClients.length > 0 && filteredClients.every((c) => selectedIds.includes(c.id));

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredClients.map((c) => c.id));
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  }

  // Approval handler
  async function setApproval(id: string, approved: boolean) {
    const { error } = await supabase.rpc(
      "approve_client" as never,
      { _client_id: id, _approved: approved } as never,
    );
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(approved ? "Client approved" : "Client rejected");
    void queryClient.invalidateQueries({ queryKey: ["clients"] });
  }

  // Promote handler
  async function promoteClient() {
    if (!promoteId) return;
    const { error } = await (supabase as any).rpc("promote_client_to_staff", {
      _client_id: promoteId,
      _job_title: jobTitle,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Client promoted to staff");
    setPromoteId(null);
    setJobTitle("Staff");
    void queryClient.invalidateQueries({ queryKey: ["clients"] });
  }

  // Export to CSV
  function handleExportCsv(subset?: any[]) {
    const dataToExport = subset || filteredClients;
    if (dataToExport.length === 0) {
      toast.error("No clients to export");
      return;
    }
    const headers = [
      "Client Name",
      "Email",
      "Phone",
      "WhatsApp",
      "Institution",
      "Status",
      "Acquisition Source",
      "Tags",
      "Address",
      "Created Date",
    ];
    const rows = dataToExport.map((c: any) => [
      c.full_name,
      c.email || "",
      c.phone || "",
      c.whatsapp || "",
      c.institution || "",
      c.status || "active",
      c.acquisition_source || "",
      Array.isArray(c.tags) ? c.tags.join("; ") : "",
      c.address || "",
      c.created_at ? new Date(c.created_at).toLocaleDateString() : "",
    ]);
    exportToCsv(`bargazal-clients-${new Date().toISOString().slice(0, 10)}`, headers, rows);
    toast.success(`Exported ${dataToExport.length} clients to CSV`);
  }

  // Handle CSV file selection
  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportText(text);
    };
    reader.readAsText(file);
  }

  // Confirm CSV Import
  async function handleConfirmImport() {
    if (!importText.trim()) {
      toast.error("Please paste CSV data or select a CSV file");
      return;
    }
    const { rows } = parseCsv(importText);
    if (rows.length === 0) {
      toast.error("No valid client rows found in CSV");
      return;
    }

    const payload: any[] = [];
    for (const r of rows) {
      const name = r["Client Name"] || r["full_name"] || r["Name"] || r["name"];
      if (!name) continue;
      const email = r["Email"] || r["email"] || null;
      const phone = r["Phone"] || r["phone"] || null;
      const whatsapp = r["WhatsApp"] || r["whatsapp"] || null;
      const institution = r["Institution"] || r["institution"] || null;
      const status = r["Status"] || r["status"] || "active";
      const acquisition_source = r["Acquisition Source"] || r["acquisition_source"] || null;
      const tagsRaw = r["Tags"] || r["tags"] || "";
      const tags = tagsRaw
        ? tagsRaw
            .split(/[,;]/)
            .map((t: string) => t.trim())
            .filter(Boolean)
        : [];
      const address = r["Address"] || r["address"] || null;

      payload.push({
        full_name: name,
        email,
        phone,
        whatsapp,
        institution,
        status,
        acquisition_source,
        tags,
        address,
      });
    }

    if (payload.length === 0) {
      toast.error("Could not parse any valid client records. Check column headers.");
      return;
    }

    try {
      await importClientsMutation.mutateAsync(payload);
      setShowImportDialog(false);
      setImportText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      // Handled by mutation
    }
  }

  return (
    <ProtectedRoute roles={["admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clients CRM</h1>
            <p className="text-muted-foreground">
              Manage client records, acquisition sources, tags, and lifecycle.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportCsv()}
              className="gap-1.5"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportDialog(true)}
              className="gap-1.5"
            >
              <Upload className="w-4 h-4" />
              Import CSV
            </Button>
            <Button onClick={() => setShowForm(true)} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Add Client
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <Input
                  placeholder="Search by name, email, phone, tag, institution..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-muted rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    statusFilter === "all"
                      ? "bg-background shadow-xs text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Active & Leads
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("active")}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    statusFilter === "active"
                      ? "bg-background shadow-xs text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Active Only
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("inactive")}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    statusFilter === "inactive"
                      ? "bg-background shadow-xs text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Inactive
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("archived")}
                  className={`px-3 py-1 rounded-md font-medium transition-all ${
                    statusFilter === "archived"
                      ? "bg-background shadow-xs text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Archived
                </button>
              </div>
            </div>

            {/* Bulk Selection Action Bar */}
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm">
                <span className="font-semibold text-primary">
                  {selectedIds.length} client(s) selected
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => bulkUpdateStatus.mutate({ ids: selectedIds, status: "active" })}
                  >
                    Mark Active
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      bulkUpdateStatus.mutate({ ids: selectedIds, status: "inactive" })
                    }
                  >
                    Mark Inactive
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const subset = clients.filter((c) => selectedIds.includes(c.id));
                      handleExportCsv(subset);
                    }}
                  >
                    Export Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (
                        confirm(
                          `Are you sure you want to delete ${selectedIds.length} selected client(s)?`,
                        )
                      ) {
                        bulkDeleteClients.mutate(selectedIds);
                        setSelectedIds([]);
                      }
                    }}
                  >
                    Delete Selected
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clients Table */}
        <Card>
          <CardHeader>
            <CardTitle>Client Records</CardTitle>
            <CardDescription>{filteredClients.length} client(s) matching filter</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-slate-200 rounded animate-pulse" />
                ))}
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground font-medium">No clients found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Adjust filters or add a new client to get started.
                </p>
                <Button variant="outline" onClick={() => setShowForm(true)} className="mt-4">
                  Create Your First Client
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <button
                          type="button"
                          onClick={toggleSelectAll}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label="Select all"
                        >
                          {allFilteredSelected ? (
                            <CheckSquare className="w-4 h-4 text-primary" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </TableHead>
                      <TableHead>Client & Organization</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source & Tags</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client: any) => {
                      const isSelected = selectedIds.includes(client.id);
                      const isArchived = Boolean(
                        client.archived_at || client.status === "archived",
                      );
                      return (
                        <TableRow key={client.id} className={isSelected ? "bg-primary/5" : ""}>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => toggleSelectOne(client.id)}
                              className="text-muted-foreground hover:text-foreground"
                              aria-label="Select client"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-primary" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell>
                            <div>
                              <Link
                                to="/clients/$id"
                                params={{ id: client.id }}
                                className="font-semibold text-foreground hover:underline"
                              >
                                {client.full_name}
                              </Link>
                              {client.institution && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                  <Building2 className="w-3 h-3" />
                                  {client.institution}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-xs">
                              {client.email ? (
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Mail className="w-3 h-3" />
                                  <span>{client.email}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground/50">No email</span>
                              )}
                              {client.phone && (
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Phone className="w-3 h-3" />
                                  <span>{client.phone}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 items-start">
                              {isArchived ? (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-50 text-amber-800 border-amber-300"
                                >
                                  Archived
                                </Badge>
                              ) : client.status === "inactive" ? (
                                <Badge
                                  variant="outline"
                                  className="text-slate-600 border-slate-300"
                                >
                                  Inactive
                                </Badge>
                              ) : client.status === "lead" ? (
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                  Lead
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                                  Active
                                </Badge>
                              )}
                              {client.approval_status && client.approval_status !== "Approved" && (
                                <Badge variant="outline" className="text-xs text-amber-700">
                                  {client.approval_status}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1.5">
                              {client.acquisition_source && (
                                <span className="inline-block text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 rounded">
                                  {client.acquisition_source}
                                </span>
                              )}
                              {Array.isArray(client.tags) && client.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {client.tags.slice(0, 3).map((tag: string, idx: number) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-0.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded"
                                    >
                                      <Tag className="w-2.5 h-2.5" />
                                      {tag}
                                    </span>
                                  ))}
                                  {client.tags.length > 3 && (
                                    <span className="text-[10px] text-muted-foreground">
                                      +{client.tags.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditId(client.id)}
                                aria-label={`Edit ${client.full_name}`}
                                title="Edit Client"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>

                              {isArchived ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setRestoreId(client.id)}
                                  title="Restore Client"
                                  className="text-emerald-600 hover:bg-emerald-50"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setArchiveId(client.id)}
                                  title="Archive Client"
                                  className="text-amber-600 hover:bg-amber-50"
                                >
                                  <Archive className="w-4 h-4" />
                                </Button>
                              )}

                              {client.approval_status !== "Approved" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setApproval(client.id, true)}
                                >
                                  Approve
                                </Button>
                              )}

                              {client.approval_status === "Approved" &&
                                Boolean(client.auth_user_id) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setPromoteId(client.id)}
                                    title="Promote to Staff"
                                  >
                                    <ShieldCheck className="w-4 h-4 mr-1" />
                                    Staff
                                  </Button>
                                )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteId(client.id)}
                                className="text-red-600 hover:bg-red-50"
                                title="Delete Client"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <ClientFormDialog open={showForm} onOpenChange={setShowForm} />
      <ClientFormDialog
        open={Boolean(editId)}
        onOpenChange={(open) => !open && setEditId(undefined)}
        clientId={editId}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Client?"
        description="This action cannot be undone. All related projects and invoices will remain but linked to an archived client."
        confirmText="Delete"
        onConfirm={() => {
          if (deleteId) {
            deleteClient.mutate(deleteId);
            setDeleteId(null);
          }
        }}
        isLoading={deleteClient.isPending}
      />

      {/* Archive Confirmation */}
      <ConfirmDialog
        open={!!archiveId}
        onOpenChange={(open) => !open && setArchiveId(null)}
        title="Archive Client?"
        description="Archiving will hide the client from active lists while preserving all project and invoice history."
        confirmText="Archive"
        onConfirm={() => {
          if (archiveId) {
            archiveClient.mutate(archiveId);
            setArchiveId(null);
          }
        }}
        isLoading={archiveClient.isPending}
      />

      {/* Restore Confirmation */}
      <ConfirmDialog
        open={!!restoreId}
        onOpenChange={(open) => !open && setRestoreId(null)}
        title="Restore Client?"
        description="Restoring will set the client back to active status."
        confirmText="Restore"
        onConfirm={() => {
          if (restoreId) {
            restoreClient.mutate(restoreId);
            setRestoreId(null);
          }
        }}
        isLoading={restoreClient.isPending}
      />

      {/* Promote to Staff Dialog */}
      <Dialog open={Boolean(promoteId)} onOpenChange={(open) => !open && setPromoteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promote client to staff</DialogTitle>
            <DialogDescription>
              This grants the client staff access using the same login. Their client history is
              preserved.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            placeholder="Job title (e.g. Technician, Project Lead)"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteId(null)}>
              Cancel
            </Button>
            <Button onClick={() => void promoteClient()}>Promote to staff</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Import Clients from CSV</DialogTitle>
            <DialogDescription>
              Upload a .csv file or paste raw CSV data. Headers supported: Client Name (required),
              Email, Phone, WhatsApp, Institution, Status, Acquisition Source, Tags, Address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Choose CSV File:
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="text-sm file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Or Paste CSV Content:
              </label>
              <Textarea
                rows={6}
                placeholder={`Client Name,Email,Phone,Institution,Tags\n"John Doe","john@example.com","08012345678","University of Ibadan","Student; SIWES"`}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmImport}
              disabled={importClientsMutation.isPending || !importText.trim()}
            >
              {importClientsMutation.isPending ? "Importing..." : "Confirm Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  );
}
