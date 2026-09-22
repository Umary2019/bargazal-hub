import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Mail,
  Phone,
  FolderOpen,
  Receipt,
  Building2,
  Tag,
  MessageSquare,
  Calendar,
} from "lucide-react";

import { ProtectedRoute } from "@/components/app/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useClient } from "@/data/clients";
import { useProjects } from "@/data/projects";
import { useInvoices } from "@/data/invoices";
import { formatCurrency, formatDate } from "@/lib/format";

export const Route = createFileRoute("/clients/$id")({ component: ClientDetailPage });

function ClientDetailPage() {
  const { id } = Route.useParams();
  const { data: client, isLoading } = useClient(id);
  const { data: projects = [] } = useProjects({ clientId: id });
  const { data: invoices = [] } = useInvoices({ clientId: id });

  if (isLoading || !client) {
    return (
      <ProtectedRoute>
        <div className="p-8 text-center text-muted-foreground">Loading client details...</div>
      </ProtectedRoute>
    );
  }

  const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + Number(inv.amount_paid || 0), 0);
  const outstanding = invoices.reduce((sum, inv) => sum + Number(inv.balance || 0), 0);

  const isArchived = Boolean((client as any).archived_at || (client as any).status === "archived");

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 h-8 px-2"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back to Clients
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{client.full_name}</h1>
              {isArchived ? (
                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300">
                  Archived
                </Badge>
              ) : (client as any).status === "inactive" ? (
                <Badge variant="outline" className="text-slate-600 border-slate-300">
                  Inactive
                </Badge>
              ) : (client as any).status === "lead" ? (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">Lead</Badge>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Active</Badge>
              )}
            </div>
            {(client as any).institution && (
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                <Building2 className="w-3.5 h-3.5" />
                {(client as any).institution}
              </p>
            )}
          </div>
        </div>

        {/* Financial Metrics Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{projects.length}</div>
              <p className="text-xs text-muted-foreground mt-0.5">Assigned projects</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Invoiced
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {formatCurrency(totalBilled)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{invoices.length} invoice(s)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Paid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalPaid)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Lifetime revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Outstanding Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  outstanding > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"
                }`}
              >
                {formatCurrency(outstanding)}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Due balance</p>
            </CardContent>
          </Card>
        </div>

        {/* Profile & Contact Details */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Contact & CRM Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="break-all">{client.email || "No email provided"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{client.phone || "No phone provided"}</span>
                </div>
                {(client as any).whatsapp && (
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                    <a
                      href={`https://wa.me/${String((client as any).whatsapp).replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:underline font-medium"
                    >
                      WhatsApp: {(client as any).whatsapp}
                    </a>
                  </div>
                )}
                {client.address && (
                  <div className="text-xs text-muted-foreground border-t pt-3">
                    <span className="font-medium text-foreground block mb-1">Address:</span>
                    {client.address}
                  </div>
                )}
              </div>

              {/* Acquisition Source & Tags */}
              <div className="border-t pt-3 space-y-2">
                {(client as any).acquisition_source && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground block mb-1">
                      Acquisition Source:
                    </span>
                    <Badge variant="outline">{(client as any).acquisition_source}</Badge>
                  </div>
                )}

                {Array.isArray((client as any).tags) && (client as any).tags.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground block mb-1">
                      Tags:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(client as any).tags.map((t: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="gap-1 text-[11px]">
                          <Tag className="w-2.5 h-2.5" />
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {client.notes && (
                <div className="border-t pt-3">
                  <span className="font-medium text-foreground block mb-1 text-xs">Notes:</span>
                  <p className="whitespace-pre-wrap text-xs text-muted-foreground bg-muted p-2 rounded">
                    {client.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Projects & Invoices */}
          <div className="space-y-6 lg:col-span-2">
            {/* Projects Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Projects ({projects.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No projects found for this client.
                  </p>
                ) : (
                  <div className="divide-y">
                    {projects.map((proj) => (
                      <div
                        key={proj.id}
                        className="py-3 flex items-center justify-between gap-3 text-sm"
                      >
                        <div className="space-y-0.5">
                          <Link
                            to="/projects/$id"
                            params={{ id: proj.id }}
                            className="font-medium hover:underline flex items-center gap-1.5"
                          >
                            <FolderOpen className="w-4 h-4 text-primary shrink-0" />
                            {proj.title}
                          </Link>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>#{proj.project_number}</span>
                            {proj.deadline && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Due: {formatDate(proj.deadline)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline">{proj.status}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Invoices Card */}
            <Card>
              <CardHeader>
                <CardTitle>Invoices ({invoices.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No invoices issued for this client yet.
                  </p>
                ) : (
                  <div className="divide-y">
                    {invoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="py-3 flex items-center justify-between gap-3 text-sm"
                      >
                        <div className="space-y-0.5">
                          <Link
                            to="/invoices/$id"
                            params={{ id: inv.id }}
                            className="font-medium hover:underline flex items-center gap-1.5"
                          >
                            <Receipt className="w-4 h-4 text-primary shrink-0" />
                            {inv.invoice_number}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            Issued: {inv.issue_date ? formatDate(inv.issue_date) : "—"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-foreground">
                            {formatCurrency(Number(inv.total))}
                          </div>
                          <Badge
                            className={
                              inv.status === "Paid"
                                ? "bg-emerald-100 text-emerald-800"
                                : inv.status === "Overdue"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                            }
                          >
                            {inv.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
