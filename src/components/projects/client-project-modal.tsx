import { useState } from "react";
import {
  Download,
  FileText,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  MessageSquare,
  RotateCcw,
  ShieldCheck,
  User,
  Paperclip,
  Calendar,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";
import { useProjectFiles, useAcceptDelivery } from "@/data/projects";
import { useProjectRevisions, useRequestRevision } from "@/data/project-revisions";
import { useProjectMessages, usePostProjectMessage } from "@/data/project-messages";
import { supabase } from "@/integrations/supabase/client";

interface ClientProjectModalProps {
  project: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientProjectModal({ project, open, onOpenChange }: ClientProjectModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "files" | "messages" | "revisions">(
    "overview",
  );
  const [revisionReason, setRevisionReason] = useState("");
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [deliveryFeedback, setDeliveryFeedback] = useState("");
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);

  const { data: files = [], isLoading: filesLoading } = useProjectFiles(project?.id);
  const { data: revisions = [], isLoading: revisionsLoading } = useProjectRevisions(project?.id);
  const { data: messages = [], isLoading: messagesLoading } = useProjectMessages(project?.id);

  const acceptDelivery = useAcceptDelivery();
  const requestRevision = useRequestRevision();
  const postMessage = usePostProjectMessage();

  if (!project) return null;

  const isCompleted = project.status === "Completed";
  const canAcceptOrRevise = !isCompleted && project.status !== "Cancelled";

  async function handleDownload(storagePath: string, fileName: string) {
    try {
      setDownloadingPath(storagePath);
      const { data, error } = await supabase.storage
        .from("business-files")
        .createSignedUrl(storagePath, 300);

      if (error || !data?.signedUrl) {
        throw error ?? new Error("Could not generate secure download link");
      }

      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.download = fileName;
      link.target = "_blank";
      link.rel = "noopener,noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Download started");
    } catch (err: any) {
      toast.error(err?.message || "Failed to download file. Please try again.");
    } finally {
      setDownloadingPath(null);
    }
  }

  async function handleConfirmAccept() {
    try {
      await acceptDelivery.mutateAsync({
        projectId: project.id,
        ...(deliveryFeedback.trim() ? { feedback: deliveryFeedback.trim() } : {}),
      });
      setShowAcceptConfirm(false);
      onOpenChange(false);
    } catch {
      // Error handled by mutation
    }
  }

  async function handleSubmitRevision(e: React.FormEvent) {
    e.preventDefault();
    if (!revisionReason.trim()) {
      toast.error("Please explain what requires revision");
      return;
    }
    try {
      await requestRevision.mutateAsync({
        projectId: project.id,
        reason: revisionReason.trim(),
      });
      setRevisionReason("");
      setShowRevisionForm(false);
      setActiveTab("revisions");
    } catch {
      // Error handled by mutation
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim()) return;
    try {
      await postMessage.mutateAsync({
        projectId: project.id,
        message: messageText.trim(),
      });
      setMessageText("");
    } catch {
      // Error handled by mutation
    }
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pr-6">
            <div>
              <DialogTitle className="text-xl font-bold">{project.title}</DialogTitle>
              <DialogDescription className="text-xs font-mono mt-0.5">
                {project.project_number} · {project.services?.name ?? "Custom Project"}
              </DialogDescription>
            </div>
            <Badge
              variant={isCompleted ? "default" : "outline"}
              className={isCompleted ? "bg-emerald-600 text-white" : ""}
            >
              {project.status}
            </Badge>
          </div>
        </DialogHeader>

        {/* Action Header for Delivery / Revisions */}
        {canAcceptOrRevise && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
            <div>
              <p className="font-semibold text-foreground">Project Delivery & Review</p>
              <p className="text-xs text-muted-foreground">
                Download delivered deliverables below. You can approve completion or request
                revisions anytime.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => {
                  setShowRevisionForm(true);
                  setShowAcceptConfirm(false);
                }}
              >
                <RotateCcw className="h-3.5 w-3.5" /> Request Revision
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  setShowAcceptConfirm(true);
                  setShowRevisionForm(false);
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Approve Delivery
              </Button>
            </div>
          </div>
        )}

        {/* Accept Delivery Confirmation Panel */}
        {showAcceptConfirm && (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/20 p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
              <CheckCircle2 className="h-5 w-5" /> Confirm Project Acceptance
            </div>
            <p className="text-xs text-emerald-900/80 dark:text-emerald-200">
              By confirming, you acknowledge that project deliverables have been received and
              verified. The project will be marked as Completed (100%).
            </p>
            <Textarea
              placeholder="Optional feedback or testimonial for our team..."
              value={deliveryFeedback}
              onChange={(e) => setDeliveryFeedback(e.target.value)}
              className="text-xs bg-white dark:bg-black/30"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowAcceptConfirm(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={acceptDelivery.isPending}
                onClick={handleConfirmAccept}
              >
                {acceptDelivery.isPending ? "Confirming..." : "Confirm & Complete"}
              </Button>
            </div>
          </div>
        )}

        {/* Request Revision Form Panel */}
        {showRevisionForm && (
          <form
            onSubmit={handleSubmitRevision}
            className="rounded-lg border border-amber-300 bg-amber-50/70 dark:bg-amber-950/20 p-4 space-y-3"
          >
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-sm">
              <RotateCcw className="h-4 w-4" /> Request Project Revision
            </div>
            <p className="text-xs text-amber-900/80 dark:text-amber-200">
              Specify the exact adjustments, corrections, or chapter sections that need attention.
              The assigned technical specialist will be notified immediately.
            </p>
            <Textarea
              required
              placeholder="Detail your revision requirements here..."
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              className="text-xs bg-white dark:bg-black/30"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={() => setShowRevisionForm(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-amber-600 hover:bg-amber-700 text-white"
                type="submit"
                disabled={requestRevision.isPending || !revisionReason.trim()}
              >
                {requestRevision.isPending ? "Submitting..." : "Submit Revision Request"}
              </Button>
            </div>
          </form>
        )}

        {/* Workspace Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview" className="text-xs">
              Overview
            </TabsTrigger>
            <TabsTrigger value="files" className="text-xs">
              Files ({files.length})
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-xs">
              Messages ({messages.length})
            </TabsTrigger>
            <TabsTrigger value="revisions" className="text-xs">
              Revisions ({revisions.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW */}
          <TabsContent value="overview" className="space-y-4 pt-2">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span>Progress</span>
                <span>{project.progress ?? 0}% Complete</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, project.progress ?? 0))}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="rounded-md border p-2.5">
                <span className="text-muted-foreground block">Assigned Specialist</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {project.assigned_staff?.full_name ?? "Operations Team"}
                </span>
                {project.assigned_staff?.job_title && (
                  <span className="text-[10px] text-muted-foreground block truncate">
                    {project.assigned_staff.job_title}
                  </span>
                )}
              </div>
              <div className="rounded-md border p-2.5">
                <span className="text-muted-foreground block">Deadline</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {project.deadline ? formatDate(project.deadline) : "Flexible"}
                </span>
              </div>
              <div className="rounded-md border p-2.5">
                <span className="text-muted-foreground block">Priority</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {project.priority ?? "Normal"}
                </span>
              </div>
              <div className="rounded-md border p-2.5">
                <span className="text-muted-foreground block">Budget</span>
                <span className="font-semibold text-foreground mt-0.5 block">
                  {project.budget ? formatCurrency(project.budget) : "Standard"}
                </span>
              </div>
            </div>

            {project.description && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">
                  Project Scope & Details
                </span>
                <div className="rounded-md border bg-muted/20 p-3 text-xs leading-relaxed whitespace-pre-wrap">
                  {project.description}
                </div>
              </div>
            )}

            {isCompleted && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>
                  This project is completed and verified. You can access all delivered files under
                  the Files tab.
                </span>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: DELIVERED FILES */}
          <TabsContent value="files" className="space-y-3 pt-2">
            {filesLoading ? (
              <p className="py-6 text-center text-xs text-muted-foreground">Loading files...</p>
            ) : files.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
                <FileText className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="font-medium text-foreground">No files delivered yet</p>
                <p className="mt-0.5">
                  Deliverables uploaded by your assigned specialist will appear here for instant
                  download.
                </p>
              </div>
            ) : (
              <div className="divide-y rounded-lg border">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 text-xs hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-medium truncate text-foreground">{file.name}</p>
                          {(file as any).version && (
                            <Badge variant="outline" className="text-[10px] font-mono">
                              v{(file as any).version}
                            </Badge>
                          )}
                          {(file as any).category && (
                            <Badge variant="secondary" className="text-[10px]">
                              {(file as any).category}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {formatFileSize(file.size_bytes)} · Uploaded {formatDate(file.created_at)}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-8 text-xs shrink-0"
                      disabled={downloadingPath === file.storage_path}
                      onClick={() => handleDownload(file.storage_path, file.name)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {downloadingPath === file.storage_path ? "Preparing..." : "Download"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* TAB 3: PROJECT MESSAGES */}
          <TabsContent value="messages" className="space-y-3 pt-2">
            <div className="max-h-60 overflow-y-auto space-y-2 rounded-lg border p-3 bg-muted/10">
              {messagesLoading ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  Loading conversation...
                </p>
              ) : messages.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  <MessageSquare className="mx-auto mb-1.5 h-6 w-6 text-muted-foreground/40" />
                  <p>No messages yet. Send a question or note below to reach your specialist.</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-lg p-2.5 text-xs max-w-[85%] ${
                      msg.sender_role === "client"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "mr-auto bg-muted border"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1 text-[10px] opacity-80">
                      <span className="font-semibold">
                        {msg.sender_name} ({msg.sender_role})
                      </span>
                      <span>{formatDateTime(msg.created_at)}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                placeholder="Type a message or question about your project..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="text-xs"
              />
              <Button
                size="sm"
                type="submit"
                disabled={postMessage.isPending || !messageText.trim()}
                className="gap-1"
              >
                <Send className="h-3.5 w-3.5" /> Send
              </Button>
            </form>
          </TabsContent>

          {/* TAB 4: REVISIONS */}
          <TabsContent value="revisions" className="space-y-3 pt-2">
            {revisionsLoading ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Loading revision history...
              </p>
            ) : revisions.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                <RotateCcw className="mx-auto mb-1.5 h-6 w-6 text-muted-foreground/40" />
                <p>No revisions requested for this project.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {revisions.map((rev) => (
                  <div key={rev.id} className="rounded-lg border p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={rev.status === "Resolved" ? "default" : "outline"}
                        className={rev.status === "Resolved" ? "bg-emerald-600 text-white" : ""}
                      >
                        {rev.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        Requested {formatDate(rev.created_at)}
                      </span>
                    </div>
                    <p className="font-medium text-foreground">{rev.reason}</p>
                    {rev.admin_notes && (
                      <div className="rounded bg-muted/40 p-2 text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground">Specialist Response: </span>
                        {rev.admin_notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
