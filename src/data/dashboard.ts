import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { ACTIVE_PROJECT_STATUSES } from "@/lib/constants";
import { toNumber } from "@/lib/format";

export type MonthlyPoint = { month: string; revenue: number; expenses: number; profit: number };

export type DashboardData = {
  revenue: number;
  expenses: number;
  profit: number;
  outstanding: number;
  clientCount: number;
  activeProjects: number;
  overdueInvoices: number;
  finalYearProjects: number;
  monthly: MonthlyPoint[];
  statusBreakdown: { status: string; count: number }[];
  topServices: { name: string; revenue: number }[];
};

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async (): Promise<DashboardData> => {
      const [paymentsRes, expensesRes, invoicesRes, clientsRes, projectsRes] = await Promise.all([
        supabase.from("payments").select("amount, payment_date").limit(5000),
        supabase.from("expenses").select("amount, expense_date").limit(5000),
        supabase.from("invoices").select("total, amount_paid, status, due_date").limit(5000),
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase
          .from("projects")
          .select("status, is_final_year, budget, services(name)")
          .limit(5000),
      ]);

      for (const res of [paymentsRes, expensesRes, invoicesRes, clientsRes, projectsRes]) {
        if (res.error) throw res.error;
      }

      const payments = paymentsRes.data ?? [];
      const expenses = expensesRes.data ?? [];
      const invoices = invoicesRes.data ?? [];
      const projects = (projectsRes.data ?? []) as {
        status: string;
        is_final_year: boolean;
        budget: number | string;
        services: { name: string } | null;
      }[];

      const revenue = payments.reduce((sum, row) => sum + toNumber(row.amount), 0);
      const expenseTotal = expenses.reduce((sum, row) => sum + toNumber(row.amount), 0);
      const outstanding = invoices
        .filter((row) => row.status !== "Cancelled" && row.status !== "Draft")
        .reduce((sum, row) => sum + Math.max(toNumber(row.total) - toNumber(row.amount_paid), 0), 0);

      const today = new Date().toISOString().slice(0, 10);
      const overdueInvoices = invoices.filter(
        (row) =>
          row.due_date &&
          row.due_date < today &&
          toNumber(row.total) - toNumber(row.amount_paid) > 0 &&
          row.status !== "Cancelled",
      ).length;

      const months: MonthlyPoint[] = [];
      const now = new Date();
      for (let index = 11; index >= 0; index -= 1) {
        const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const label = `${MONTH_LABELS[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`;
        const monthRevenue = payments
          .filter((row) => (row.payment_date ?? "").startsWith(key))
          .reduce((sum, row) => sum + toNumber(row.amount), 0);
        const monthExpenses = expenses
          .filter((row) => (row.expense_date ?? "").startsWith(key))
          .reduce((sum, row) => sum + toNumber(row.amount), 0);
        months.push({
          month: label,
          revenue: monthRevenue,
          expenses: monthExpenses,
          profit: monthRevenue - monthExpenses,
        });
      }

      const statusCounts = new Map<string, number>();
      const serviceRevenue = new Map<string, number>();
      for (const project of projects) {
        statusCounts.set(project.status, (statusCounts.get(project.status) ?? 0) + 1);
        const serviceName = project.services?.name ?? "Unassigned";
        serviceRevenue.set(serviceName, (serviceRevenue.get(serviceName) ?? 0) + toNumber(project.budget));
      }

      return {
        revenue,
        expenses: expenseTotal,
        profit: revenue - expenseTotal,
        outstanding,
        clientCount: clientsRes.count ?? 0,
        activeProjects: projects.filter((p) => ACTIVE_PROJECT_STATUSES.includes(p.status as never)).length,
        overdueInvoices,
        finalYearProjects: projects.filter((p) => p.is_final_year).length,
        monthly: months,
        statusBreakdown: [...statusCounts.entries()].map(([status, count]) => ({ status, count })),
        topServices: [...serviceRevenue.entries()]
          .map(([name, rev]) => ({ name, revenue: rev }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5),
      };
    },
  });
}
