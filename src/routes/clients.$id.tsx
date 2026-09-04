import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, Phone, FolderOpen, Receipt } from "lucide-react";

import { ProtectedRoute } from "@/components/app/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useClient } from "@/data/clients";
import { useProjects } from "@/data/projects";
import { useInvoices } from "@/data/invoices";
import { formatCurrency } from "@/lib/format";

export const Route = createFileRoute("/clients/$id")({ component: ClientDetailPage });

function ClientDetailPage() {
  const { id } = Route.useParams();
  const { data: client, isLoading } = useClient(id);
  const { data: projects = [] } = useProjects({ clientId: id });
  const { data: invoices = [] } = useInvoices({ clientId: id });

  if (isLoading || !client) {
    return (
      <ProtectedRoute>
        <div className="p-4 text-muted-foreground">Loading client...</div>
      </ProtectedRoute>
    );
  }

  const outstanding = invoices.reduce((total, invoice) => total + Number(invoice.balance || 0), 0);

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 h-8 px-2"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{client.full_name}</h1>
          <p className="text-muted-foreground">Client profile</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Projects</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{projects.length}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Invoices</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold">{invoices.length}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Outstanding</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-bold text-amber-600">
              {formatCurrency(outstanding)}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {client.email || "No email"}
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {client.phone || "No phone"}
              </div>
              <div className="text-muted-foreground">{client.address || "No address"}</div>
              {client.notes && (
                <p className="whitespace-pre-wrap text-muted-foreground">{client.notes}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {projects.length === 0 && invoices.length === 0 && (
                <p className="text-sm text-muted-foreground">No projects or invoices yet.</p>
              )}
              {projects.slice(0, 4).map((project) => (
                <Link
                  key={project.id}
                  to="/projects/$id"
                  params={{ id: project.id }}
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  <FolderOpen className="h-4 w-4" />
                  {project.title}
                </Link>
              ))}
              {invoices.slice(0, 4).map((invoice) => (
                <Link
                  key={invoice.id}
                  to="/invoices/$id"
                  params={{ id: invoice.id }}
                  className="flex items-center gap-2 text-sm hover:underline"
                >
                  <Receipt className="h-4 w-4" />
                  {invoice.invoice_number}
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
