import { useState } from "react";
import {
  RotateCcw,
  MessageSquare,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  User,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useProjectRevisions,
  useResolveRevision,
  type ProjectRevision,
} from "@/data/project-revisions";
import { useProjectMessages, usePostProjectMessage } from "@/data/project-messages";
import { formatDate, formatDateTime } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";

interface ProjectCollaborationCardProps {
  projectId: string;
  projectTitle: string;
}

export function ProjectCollaborationCard({
  projectId,
  projectTitle,
}: ProjectCollaborationCardProps) {
  const { role } = useAuth();
  const [selectedRevision, setSelectedRevision] = useState<ProjectRevision | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [messageText, setMessageText] = useState("");

  const { data: revisions = [], isLoading: revisionsLoading } = useProjectRevisions(projectId);
  const { data: messages = [], isLoading: messagesLoading } = useProjectMessages(projectId);
  const resolveRevision = useResolveRevision();
  const postMessage = usePostProjectMessage();

  const pendingRevisions = revisions.filter((r) => r.status !== "Resolved");

  async function handleResolveSubmit() {
    if (!selectedRevision) return;
    try {
      await resolveRevision.mutateAsync({
        revisionId: selectedRevision.id,
        projectId,
        status: "Resolved",
        ...(resolutionNotes.trim() ? { notes: resolutionNotes.trim() } : {}),
      });
      setSelectedRevision(null);
      setResolutionNotes("");
      toast.success("Revision resolved successfully");
    } catch {
      // Error handled in hook
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim()) return;
    try {
      await postMessage.mutateAsync({
        projectId,
        message: messageText.trim(),
      });
      setMessageText("");
    } catch {
      // Error handled in hook
    }
  }

  return (
    <Card className="shadow-xs border">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl font-bold">
              <MessageSquare className="h-5 w-5 text-primary" /> Client Collaboration & Revisions
            </CardTitle>
            <CardDescription>
              Manage client revision requests and project clarification messages.
            </CardDescription>
          </div>
          {pendingRevisions.length > 0 && (
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300 self-start sm:self-auto gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {pendingRevisions.length} active revision{pendingRevisions.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="messages" className="space-y-4">
          <TabsList className="grid grid-cols-2 max-w-sm">
            <TabsTrigger value="messages" className="gap-1.5 text-xs">
              <MessageSquare className="h-3.5 w-3.5" /> Messages ({messages.length})
            </TabsTrigger>
            <TabsTrigger value="revisions" className="gap-1.5 text-xs">
              <RotateCcw className="h-3.5 w-3.5" /> Revisions ({revisions.length})
            </TabsTrigger>
          </TabsList>

          {/* MESSAGES TAB */}
          <TabsContent value="messages" className="space-y-4">
            <div className="space-y-3">
              <div className="max-h-80 overflow-y-auto rounded-lg border bg-muted/20 p-4 space-y-3">
                {messagesLoading ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Loading messages...
                  </p>
                ) : messages.length === 0 ? (
                  <div className="py-6 text-center">
                    <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/50 mb-1" />
                    <p className="text-xs text-muted-foreground">
                      No messages on this project yet. Start a discussion with the client below.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isClient = m.sender_role === "client";
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col gap-1 rounded-lg p-3 text-sm ${
                          isClient
                            ? "bg-slate-100 dark:bg-slate-800 ml-4 border-l-2 border-l-blue-500"
                            : "bg-primary/10 mr-4 border-l-2 border-l-primary"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            {isClient ? (
                              <User className="h-3 w-3 text-blue-600" />
                            ) : (
                              <ShieldCheck className="h-3 w-3 text-primary" />
                            )}
                            {m.sender_name || (isClient ? "Client" : "Team Member")}
                            <span className="font-normal text-muted-foreground text-[10px] capitalize">
                              ({m.sender_role})
                            </span>
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {formatDateTime(m.created_at)}
                          </span>
                        </div>
                        <p className="text-foreground whitespace-pre-wrap mt-0.5 text-xs">
                          {m.message}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* POST MESSAGE FORM */}
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Textarea
                  placeholder="Send a project update, clarification, or question..."
                  className="text-xs min-h-[50px] resize-none"
                  rows={2}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                />
                <Button
                  type="submit"
                  size="sm"
                  className="gap-1.5 self-end shrink-0"
                  disabled={!messageText.trim() || postMessage.isPending}
                >
                  <Send className="h-3.5 w-3.5" />
                  Send
                </Button>
              </form>
            </div>
          </TabsContent>

          {/* REVISIONS TAB */}
          <TabsContent value="revisions" className="space-y-4">
            {revisionsLoading ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Loading revisions...
              </p>
            ) : revisions.length === 0 ? (
              <div className="py-8 text-center border rounded-lg bg-muted/10">
                <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600 mb-1" />
                <p className="text-sm font-semibold text-foreground">No revision requests</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Client has not requested any modifications on deliverables.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {revisions.map((rev, index) => (
                  <div
                    key={rev.id}
                    className={`rounded-lg border p-4 space-y-3 ${
                      rev.status === "Resolved"
                        ? "border-emerald-200 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-emerald-950/10"
                        : "border-amber-200 bg-amber-50/20 dark:border-amber-900/40 dark:bg-amber-950/10"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            Revision #{revisions.length - index}
                          </span>
                          <Badge
                            className={
                              rev.status === "Resolved"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                            }
                          >
                            {rev.status}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Requested: {formatDate(rev.created_at)}
                        </p>
                      </div>
                      {rev.status !== "Resolved" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950"
                          onClick={() => setSelectedRevision(rev)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Mark Resolved
                        </Button>
                      )}
                    </div>

                    <div className="rounded-md border bg-background/80 p-3 text-xs space-y-1">
                      <span className="font-medium text-foreground block">Client Feedback:</span>
                      <p className="text-muted-foreground whitespace-pre-wrap">{rev.reason}</p>
                    </div>

                    {rev.status === "Resolved" && (
                      <div className="rounded-md border border-emerald-300 bg-emerald-50 p-2.5 text-xs text-emerald-950 dark:border-emerald-900/80 dark:bg-emerald-950/40 dark:text-emerald-200">
                        <span className="font-semibold">
                          Resolved {rev.resolved_at ? `on ${formatDate(rev.resolved_at)}` : ""}:{" "}
                        </span>
                        <span>{rev.admin_notes || "Delivered revision successfully addressed."}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* RESOLVE REVISION DIALOG */}
      <Dialog
        open={Boolean(selectedRevision)}
        onOpenChange={(open) => !open && setSelectedRevision(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resolve Revision Request</DialogTitle>
            <DialogDescription>
              Confirm that you have addressed the client&apos;s requested changes and uploaded updated deliverables.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg border bg-muted/30 p-3 text-xs">
              <span className="font-semibold block mb-1">Client Feedback:</span>
              <p className="text-muted-foreground whitespace-pre-wrap">{selectedRevision?.reason}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Resolution Notes / Deliverable Summary (Optional)
              </label>
              <Textarea
                placeholder="Explain the changes made or highlight updated files..."
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRevision(null)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              onClick={handleResolveSubmit}
              disabled={resolveRevision.isPending}
            >
              <CheckCircle2 className="h-4 w-4" />
              {resolveRevision.isPending ? "Resolving..." : "Confirm Resolution"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
