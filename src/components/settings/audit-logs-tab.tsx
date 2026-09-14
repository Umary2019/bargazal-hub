import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  History,
  Download,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv } from "@/lib/csv";
import { formatDateTime } from "@/lib/format";

export function AuditLogsTab() {
  const [entityFilter, setEntityFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin_audit_logs"],
    queryFn: async () => {
      const [logsRes, profilesRes] = await Promise.all([
        supabase
          .from("activity_log")
          .select("id, action, actor_id, created_at, detail, entity_id, entity_type")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.from("profiles").select("id, full_name, email"),
      ]);

      if (logsRes.error) throw logsRes.error;

      const profileMap = new Map<string, { full_name: string | null; email: string | null }>();
      (profilesRes.data ?? []).forEach((p) => {
        profileMap.set(p.id, { full_name: p.full_name, email: p.email });
      });

      return (logsRes.data ?? []).map((log) => {
        const actor = log.actor_id ? profileMap.get(log.actor_id) : null;
        return {
          ...log,
          actorName: actor?.full_name || actor?.email || "System / Admin",
        };
      });
    },
  });

  const logs = data ?? [];

  const filteredLogs = logs.filter((item) => {
    const matchesEntity = entityFilter === "all" || item.entity_type.toLowerCase() === entityFilter.toLowerCase();
    const matchesSearch =
      !searchTerm.trim() ||
      item.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.detail && item.detail.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.entity_id && item.entity_id.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesEntity && matchesSearch;
  });

  const handleExportCsv = () => {
    exportToCsv(
      `bargazal-audit-logs-${new Date().toISOString().slice(0, 10)}`,
      ["Timestamp", "Actor", "Action", "Entity Type", "Entity ID", "Details"],
      filteredLogs.map((l) => [
        l.created_at,
        l.actorName,
        l.action,
        l.entity_type,
        l.entity_id ?? "",
        l.detail ?? "",
      ])
    );
  };

  const getEntityBadgeVariant = (type: string) => {
    switch (type.toLowerCase()) {
      case "invoice":
      case "payment":
        return "default";
      case "project":
        return "secondary";
      case "client":
        return "outline";
      case "auth":
      case "security":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            System Audit & Activity Logs
          </CardTitle>
          <CardDescription>
            Immutable chronological record of administrative actions, payments, status modifications, and security events.
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
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export Audit (CSV)
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by action, details, actor, or entity ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 sm:w-56">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="invoice">Invoices</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
                <SelectItem value="project">Projects</SelectItem>
                <SelectItem value="client">Clients</SelectItem>
                <SelectItem value="expense">Expenses</SelectItem>
                <SelectItem value="auth">Auth & Security</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      <Clock className="w-5 h-5 mx-auto mb-2 animate-spin text-blue-500" />
                      Loading audit logs...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No audit events found matching the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground font-mono">
                        {formatDateTime(log.created_at)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-medium flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{log.actorName}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={getEntityBadgeVariant(log.entity_type)}>
                          {log.entity_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate" title={log.detail ?? ""}>
                        {log.detail || log.entity_id || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <span>Showing {filteredLogs.length} logged events (capped at 200 recent)</span>
          <span className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            Append-only secure log
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
