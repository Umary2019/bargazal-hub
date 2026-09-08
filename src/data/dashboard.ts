import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { ACTIVE_PROJECT_STATUSES } from "@/lib/constants";
import { toNumber } from "@/lib/format";
import { fetchAllPages } from "@/lib/paginate";

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
  revenueByClient: { name: string; revenue: number }[];
  expensesByCategory: { name: string; total: number }[];
  paymentsByMethod: { name: string; total: number }[];
};

export type DashboardRange = "thisMonth" | "thisYear" | "allTime";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function useDashboard(range: DashboardRange = "allTime") {
  return useQuery({
    queryKey: ["dashboard", range],
    queryFn: async (): Promise<DashboardData> => {
      const [payments, expenses, invoices, clientsRes, projects] = await Promise.all([
        fetchAllPages((from, to) =>
          supabase
            .from("payments")
            .select("amount, payment_date, payment_method, clients(full_name)")
            .is("voided_at", null)
            .range(from, to),
        ),
        fetchAllPages((from, to) =>
          supabase
            .from("expenses")
            .select("amount, expense_date, category, payment_method")
            .range(from, to),
        ),
        fetchAllPages((from, to) =>
          supabase
            .from("invoices")
            .select("total, amount_paid, balance, status, due_date")
            .range(from, to),
        ),
        supabase.from("clients").select("id", { count: "exact", head: true }),
        fetchAllPages((from, to) =>
          supabase
            .from("projects")
            .select("status, is_final_year, budget, services(name)")
            .range(from, to),
        ),
      ]);

      if (clientsRes.error) throw clientsRes.error;

      const projectRows = projects as {
        status: string;
        is_final_year: boolean;
        budget: number | string;
        services: { name: string } | null;
      }[];
      const now = new Date();
      const periodStart =
        range === "thisMonth"
          ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
          : range === "thisYear"
            ? `${now.getFullYear()}-01`
            : null;
      const periodPayments = periodStart
        ? payments.filter((row) => (row.payment_date ?? "").startsWith(periodStart))
        : payments;
      const periodExpenses = periodStart
        ? expenses.filter((row) => (row.expense_date ?? "").startsWith(periodStart))
        : expenses;
      const paymentRows = periodPayments as Array<{
        amount: number;
        payment_date: string;
        payment_method: string;
        clients: { full_name: string } | null;
      }>;
      const expenseRows = periodExpenses as Array<{
        amount: number;
        expense_date: string;
        category: string;
        payment_method: string;
      }>;

      const revenue = periodPayments.reduce((sum, row) => sum + toNumber(row.amount), 0);
      const expenseTotal = periodExpenses.reduce((sum, row) => sum + toNumber(row.amount), 0);
      const outstanding = invoices
        .filter((row) => row.status !== "Cancelled")
        .reduce(
          (sum, row) => sum + Math.max(toNumber(row.balance ?? row.total - row.amount_paid), 0),
          0,
        );

      const today = new Date().toISOString().slice(0, 10);
      const overdueInvoices = invoices.filter(
        (row) =>
          row.due_date &&
          row.due_date < today &&
          toNumber(row.total) - toNumber(row.amount_paid) > 0 &&
          row.status !== "Cancelled",
      ).length;

      const months: MonthlyPoint[] = [];
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
      const clientRevenue = new Map<string, number>();
      const categoryExpenses = new Map<string, number>();
      const methodPayments = new Map<string, number>();
      for (const payment of paymentRows) {
        const clientName = payment.clients?.full_name ?? "Unassigned client";
        clientRevenue.set(
          clientName,
          (clientRevenue.get(clientName) ?? 0) + toNumber(payment.amount),
        );
        methodPayments.set(
          payment.payment_method,
          (methodPayments.get(payment.payment_method) ?? 0) + toNumber(payment.amount),
        );
      }
      for (const expense of expenseRows) {
        categoryExpenses.set(
          expense.category,
          (categoryExpenses.get(expense.category) ?? 0) + toNumber(expense.amount),
        );
      }
      for (const project of projectRows) {
        statusCounts.set(project.status, (statusCounts.get(project.status) ?? 0) + 1);
        const serviceName = project.services?.name ?? "Unassigned";
        serviceRevenue.set(
          serviceName,
          (serviceRevenue.get(serviceName) ?? 0) + toNumber(project.budget),
        );
      }

      return {
        revenue,
        expenses: expenseTotal,
        profit: revenue - expenseTotal,
        outstanding,
        clientCount: clientsRes.count ?? 0,
        activeProjects: projectRows.filter((p) =>
          ACTIVE_PROJECT_STATUSES.includes(p.status as never),
        ).length,
        overdueInvoices,
        finalYearProjects: projectRows.filter((p) => p.is_final_year).length,
        monthly: months,
        statusBreakdown: [...statusCounts.entries()].map(([status, count]) => ({ status, count })),
        topServices: [...serviceRevenue.entries()]
          .map(([name, rev]) => ({ name, revenue: rev }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5),
        revenueByClient: [...clientRevenue.entries()]
          .map(([name, revenue]) => ({ name, revenue }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10),
        expensesByCategory: [...categoryExpenses.entries()]
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => b.total - a.total),
        paymentsByMethod: [...methodPayments.entries()]
          .map(([name, total]) => ({ name, total }))
          .sort((a, b) => b.total - a.total),
      };
    },
  });
}
