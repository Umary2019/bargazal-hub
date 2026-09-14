import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  TrendingUp,
  Inbox,
  FileText,
  FolderKanban,
  CheckCircle2,
  Users,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVE_PROJECT_STATUSES } from "@/lib/constants";

export function CrmSalesFunnel() {
  const { data: funnel, isLoading } = useQuery({
    queryKey: ["crm-funnel-metrics"],
    queryFn: async () => {
      // 1. Service requests
      const { data: requests = [] } = await supabase
        .from("service_requests" as never)
        .select("id, status");

      // 2. Quotes
      const { data: quotes = [] } = await supabase
        .from("quotes" as never)
        .select("id, status");

      // 3. Projects
      const { data: projects = [] } = await supabase
        .from("projects")
        .select("id, status");

      // 4. Clients acquisition source
      const { data: clients = [] } = await supabase
        .from("clients")
        .select("id, acquisition_source, status");

      const totalInquiries = (requests ?? []).length;
      const pendingInquiries = (requests ?? []).filter((r: any) => r.status === "pending").length;
      const approvedInquiries = (requests ?? []).filter((r: any) => r.status === "approved").length;

      const totalQuotes = (quotes ?? []).length;
      const acceptedQuotes = (quotes ?? []).filter((q: any) => q.status === "accepted").length;

      const activeProjects = (projects ?? []).filter(
        (p) => ACTIVE_PROJECT_STATUSES.includes(p.status as any) || p.status === "Planning"
      ).length;
      const completedProjects = (projects ?? []).filter((p) => p.status === "Completed").length;

      // Sources
      const sourceCounts: Record<string, number> = {
        Direct: 0,
        Website: 0,
        Referral: 0,
        "Social Media": 0,
        "Walk-in": 0,
        Other: 0,
      };

      (clients ?? []).forEach((c: any) => {
        const src = c.acquisition_source || "Direct";
        sourceCounts[src] = (sourceCounts[src] || 0) + 1;
      });

      return {
        totalInquiries: Math.max(totalInquiries, (clients ?? []).length),
        pendingInquiries,
        approvedInquiries,
        totalQuotes,
        acceptedQuotes,
        activeProjects,
        completedProjects,
        sourceCounts,
        totalClients: (clients ?? []).length,
      };
    },
  });

  if (isLoading || !funnel) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">Loading sales funnel metrics...</p>
        </CardContent>
      </Card>
    );
  }

  const stages = [
    {
      label: "Inquiries & Leads",
      count: funnel.totalInquiries,
      subtext: `${funnel.pendingInquiries} awaiting review`,
      icon: <Inbox className="w-4 h-4 text-blue-600" />,
      color: "bg-blue-500",
      link: "/requests",
    },
    {
      label: "Quotations Issued",
      count: funnel.totalQuotes,
      subtext: `${funnel.acceptedQuotes} quotes accepted`,
      icon: <FileText className="w-4 h-4 text-indigo-600" />,
      color: "bg-indigo-500",
      link: "/quotes",
    },
    {
      label: "Active Projects",
      count: funnel.activeProjects,
      subtext: "Currently in execution",
      icon: <FolderKanban className="w-4 h-4 text-amber-600" />,
      color: "bg-amber-500",
      link: "/projects",
    },
    {
      label: "Completed & Delivered",
      count: funnel.completedProjects,
      subtext: "Fulfilled client engagements",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      color: "bg-emerald-500",
      link: "/projects",
    },
  ];

  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            CRM Sales Funnel & Pipeline
          </CardTitle>
          <CardDescription>
            Conversion progression from incoming lead to successful deliverable.
          </CardDescription>
        </div>
        <Link
          to="/requests"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          View Pipeline <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Funnel Bars */}
        <div className="space-y-3">
          {stages.map((stage, idx) => {
            const widthPct = Math.max(12, Math.round((stage.count / maxCount) * 100));
            return (
              <Link
                key={idx}
                to={stage.link}
                className="group block p-2.5 rounded-lg border hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    {stage.icon}
                    {stage.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{stage.subtext}</span>
                    <span className="font-bold text-sm text-foreground">{stage.count}</span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Acquisition Source Distribution */}
        <div className="border-t pt-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-3">
            Client Acquisition Sources
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            {Object.entries(funnel.sourceCounts).map(([source, count]) => (
              <div key={source} className="p-2 rounded-lg border bg-muted/20 text-center">
                <span className="text-muted-foreground block truncate">{source}</span>
                <span className="font-bold text-base text-foreground mt-0.5 block">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
