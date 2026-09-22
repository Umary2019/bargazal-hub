import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Download } from "lucide-react";

import { ProtectedRoute } from "@/components/app/protected-route";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboard, type DashboardRange } from "@/data/dashboard";
import { formatCurrency } from "@/lib/format";
import { exportToCsv } from "@/lib/csv";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

function ReportsPage() {
  const [dateRange, setDateRange] = useState<DashboardRange>("thisMonth");
  const { data: dashboard, isLoading } = useDashboard(dateRange);

  if (isLoading || !dashboard) {
    return (
      <ProtectedRoute>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </ProtectedRoute>
    );
  }

  const report = dashboard;
  const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

  function exportReport() {
    exportToCsv(
      `bargazal-summary-report-${dateRange}`,
      ["Metric", "Value"],
      [
        ["Revenue", report.revenue],
        ["Expenses", report.expenses],
        ["Profit", report.profit],
        ["Outstanding", report.outstanding],
        ["Clients", report.clientCount],
        ["Active Projects", report.activeProjects],
        ["Overdue Invoices", report.overdueInvoices],
      ],
    );
  }

  function exportMonthly() {
    exportToCsv(
      `bargazal-monthly-financials-${dateRange}`,
      ["Month", "Revenue (NGN)", "Expenses (NGN)", "Net Profit (NGN)"],
      report.monthly.map((m) => [m.month, m.revenue, m.expenses, m.profit]),
    );
  }

  function exportServices() {
    exportToCsv(
      `bargazal-services-revenue-${dateRange}`,
      ["Service Category / Name", "Actual Revenue Collected (NGN)"],
      report.topServices.map((s) => [s.name, s.revenue]),
    );
  }

  function exportExpensesBreakdown() {
    exportToCsv(
      `bargazal-expenses-breakdown-${dateRange}`,
      ["Expense Category", "Total Amount (NGN)"],
      report.expensesByCategory.map((e) => [e.name, e.total]),
    );
  }

  function exportClients() {
    exportToCsv(
      `bargazal-clients-revenue-${dateRange}`,
      ["Client Name", "Total Revenue Collected (NGN)"],
      report.revenueByClient.map((c) => [c.name, c.revenue]),
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
            <p className="text-muted-foreground">
              Comprehensive business insights and real financial audits
            </p>
          </div>
          <Button className="gap-2" variant="outline" onClick={exportReport}>
            <Download className="w-4 h-4" />
            Export Summary (CSV)
          </Button>
        </div>

        {/* Date Range Filter */}
        <Card>
          <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              Filter Reporting Window:
            </span>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DashboardRange)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="thisYear">This Year</SelectItem>
                <SelectItem value="allTime">All Time (Historical)</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Reports Tabs */}
        <Tabs defaultValue="financial" className="space-y-4">
          <TabsList className="w-full sm:grid sm:grid-cols-4">
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
          </TabsList>

          {/* Financial Report */}
          <TabsContent value="financial" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={exportMonthly} className="gap-2">
                <Download className="w-4 h-4" /> Export Monthly Financials (CSV)
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatCurrency(dashboard.revenue)}</div>
                  <p className="text-xs text-muted-foreground mt-1">All payments received</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatCurrency(dashboard.expenses)}</div>
                  <p className="text-xs text-muted-foreground mt-1">All business expenses</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatCurrency(dashboard.profit)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {((dashboard.profit / (dashboard.revenue || 1)) * 100).toFixed(1)}% margin
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{formatCurrency(dashboard.outstanding)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Amount pending</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue vs Expenses */}
              <Card>
                <CardHeader>
                  <CardTitle>Revenue vs Expenses</CardTitle>
                  <CardDescription>Monthly comparison</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dashboard.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#3b82f6" />
                      <Line type="monotone" dataKey="expenses" stroke="#ef4444" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Profit Trend */}
              <Card>
                <CardHeader>
                  <CardTitle>Profit Trend</CardTitle>
                  <CardDescription>Monthly profit</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboard.monthly}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Bar dataKey="profit" fill="#10b981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Projects Report */}
          <TabsContent value="projects" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{dashboard.activeProjects}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">FYP Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{dashboard.finalYearProjects}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Project Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xs space-y-1">
                    {dashboard.statusBreakdown.map((s) => (
                      <div key={s.status} className="flex justify-between">
                        <span>{s.status}</span>
                        <span className="font-bold">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {dashboard.statusBreakdown.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Project Distribution by Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={dashboard.statusBreakdown}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {dashboard.statusBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Clients Report */}
          <TabsContent value="clients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Client Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{dashboard.clientCount}</div>
                <p className="text-sm text-muted-foreground mt-2">Total clients on record</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Revenue by Client</CardTitle>
                  <CardDescription>Actual payments collected by client</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={exportClients} className="gap-2">
                  <Download className="w-4 h-4" /> Export Clients (CSV)
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {dashboard.revenueByClient.map((client) => (
                  <div key={client.name} className="flex justify-between gap-4 text-sm">
                    <span>{client.name}</span>
                    <strong>{formatCurrency(client.revenue)}</strong>
                  </div>
                ))}
                {dashboard.revenueByClient.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No revenue recorded for this period.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Services Report */}
          <TabsContent value="services" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Top Services by Revenue</CardTitle>
                  <CardDescription>Actual collected revenue per service category</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={exportServices} className="gap-2">
                  <Download className="w-4 h-4" /> Export Services (CSV)
                </Button>
              </CardHeader>
              <CardContent>
                {dashboard.topServices.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboard.topServices}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as number)} />
                      <Bar dataKey="revenue" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No service data available
                  </p>
                )}
              </CardContent>
            </Card>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle>Expenses by Category</CardTitle>
                    <CardDescription>Breakdown of expenditures</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportExpensesBreakdown}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" /> Export (CSV)
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dashboard.expensesByCategory.map((item) => (
                    <div key={item.name} className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <strong>{formatCurrency(item.total)}</strong>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Payments by Method</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {dashboard.paymentsByMethod.map((item) => (
                    <div key={item.name} className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <strong>{formatCurrency(item.total)}</strong>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}
