import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Database,
  Download,
  FileArchive,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  RefreshCw,
  Table,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllPages } from "@/lib/paginate";
import { exportToCsv } from "@/lib/csv";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function BackupExportTab() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);

  // Fetch record counts for overview
  const {
    data: counts,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["backup_table_counts"],
    queryFn: async () => {
      const tables = [
        "clients",
        "projects",
        "invoices",
        "payments",
        "expenses",
        "quotes",
        "services",
        "service_categories",
        "activity_log",
      ] as const;

      const results = await Promise.all(
        tables.map(async (table) => {
          const res = await supabase
            .from(table as any)
            .select("id", { count: "exact", head: true });
          return { table, count: res.count ?? 0 };
        }),
      );

      return results;
    },
  });

  const handleExportFullJson = async () => {
    setIsExporting(true);
    toast.info("Preparing complete system database backup...");

    try {
      const [
        clients,
        projects,
        invoices,
        invoiceItems,
        payments,
        expenses,
        quotes,
        quoteItems,
        services,
        categories,
        activityLogs,
      ] = await Promise.all([
        fetchAllPages((from, to) => supabase.from("clients").select("*").range(from, to)),
        fetchAllPages((from, to) => supabase.from("projects").select("*").range(from, to)),
        fetchAllPages((from, to) => supabase.from("invoices").select("*").range(from, to)),
        fetchAllPages((from, to) => supabase.from("invoice_items").select("*").range(from, to)),
        fetchAllPages((from, to) => supabase.from("payments").select("*").range(from, to)),
        fetchAllPages((from, to) => supabase.from("expenses").select("*").range(from, to)),
        fetchAllPages((from, to) => supabase.from("quotes").select("*").range(from, to)),
        fetchAllPages((from, to) => supabase.from("quote_items").select("*").range(from, to)),
        fetchAllPages((from, to) => supabase.from("services").select("*").range(from, to)),
        fetchAllPages((from, to) =>
          supabase.from("service_categories").select("*").range(from, to),
        ),
        fetchAllPages((from, to) => supabase.from("activity_log").select("*").range(from, to)),
      ]);

      const backupPackage = {
        metadata: {
          system: "Bargazal and Sons Tech Solutions - Hub",
          version: "2.0.0",
          exported_at: new Date().toISOString(),
          exported_by: user?.email || "Admin",
          record_counts: {
            clients: clients.length,
            projects: projects.length,
            invoices: invoices.length,
            invoice_items: invoiceItems.length,
            payments: payments.length,
            expenses: expenses.length,
            quotes: quotes.length,
            quote_items: quoteItems.length,
            services: services.length,
            service_categories: categories.length,
            activity_log: activityLogs.length,
          },
        },
        data: {
          clients,
          projects,
          invoices,
          invoice_items: invoiceItems,
          payments,
          expenses,
          quotes,
          quote_items: quoteItems,
          services,
          service_categories: categories,
          activity_log: activityLogs,
        },
      };

      const jsonString = JSON.stringify(backupPackage, null, 2);
      const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = `bargazal-database-backup-${timestamp}.json`;

      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Log backup activity
      if (user?.id) {
        await supabase.from("activity_log").insert({
          action: "database_backup_downloaded",
          actor_id: user.id,
          entity_type: "system",
          detail: `Full database snapshot downloaded: ${filename}`,
        });
      }

      toast.success("Database backup package downloaded successfully!");
    } catch (err: any) {
      console.error("Backup failed:", err);
      toast.error(err.message || "Failed to generate database backup");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportTableCsv = async (table: string) => {
    try {
      toast.info(`Exporting ${table}...`);
      const rows = await fetchAllPages((from, to) =>
        supabase
          .from(table as any)
          .select("*")
          .range(from, to),
      );

      if (rows.length === 0) {
        toast.warning(`Table ${table} has no records to export`);
        return;
      }

      const headers = Object.keys(rows[0] ?? {});
      const dataRows = rows.map((r: any) => headers.map((h) => r[h]));
      exportToCsv(`bargazal-${table}-${new Date().toISOString().slice(0, 10)}`, headers, dataRows);
      toast.success(`Exported ${rows.length} records from ${table}`);
    } catch (err: any) {
      toast.error(`Failed to export ${table}: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-600" />
              Business Data Backup & Disaster Recovery
            </CardTitle>
            <CardDescription>
              Export a complete snapshot of all business data, clients, projects, finances, and
              audit logs.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh Counts
            </Button>
            <Button
              onClick={handleExportFullJson}
              disabled={isExporting}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Download className="w-4 h-4" />
              {isExporting ? "Generating Snapshot..." : "Download Full JSON Snapshot"}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Table Counts Overview */}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              Database Tables & Record Counts
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(counts ?? []).map((c) => (
                <div
                  key={c.table}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
                >
                  <div>
                    <p className="text-xs font-mono font-medium capitalize text-foreground">
                      {c.table.replace("_", " ")}
                    </p>
                    <p className="text-lg font-bold">
                      {isLoading ? "..." : Number(c.count).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExportTableCsv(c.table)}
                    className="h-8 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    title={`Export ${c.table} as CSV`}
                  >
                    <Table className="w-3.5 h-3.5" />
                    CSV
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Disaster Recovery Instructions */}
          <div className="rounded-lg border p-4 bg-slate-50 dark:bg-slate-900 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <HardDrive className="w-4 h-4 text-blue-600" />
              Disaster Recovery & Portability Notes
            </h4>
            <ul className="text-xs text-muted-foreground space-y-2 list-disc pl-5">
              <li>
                <strong>Complete Snapshot:</strong> The downloaded JSON file includes all table
                schema rows, UUID references, timestamps, and foreign key relations.
              </li>
              <li>
                <strong>Automated Supabase Backups:</strong> In addition to this on-demand export
                tool, Supabase automatically performs daily physical backups with
                Point-In-Time-Recovery (PITR).
              </li>
              <li>
                <strong>Data Restoration:</strong> In case of catastrophic data loss, this JSON
                snapshot can be imported into any PostgreSQL instance or Supabase project via our
                database restore script.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
