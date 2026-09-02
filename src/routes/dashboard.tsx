import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Users, FolderOpen, AlertCircle } from "lucide-react";

import { ProtectedRoute } from "@/components/app/protected-route";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboard } from "@/data/dashboard";
import { formatCurrency } from "@/lib/format";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: dashboard, isLoading, error } = useDashboard();

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !dashboard) {
    return (
      <ProtectedRoute>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 flex items-center gap-4">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">Unable to load dashboard</p>
              <p className="text-sm text-red-700">Please try refreshing the page</p>
            </div>
          </CardContent>
        </Card>
      </ProtectedRoute>
    );
  }

  const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

  return (
    <ProtectedRoute>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome to Bargazal and Sons Tech Solution business software</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Revenue"
            value={formatCurrency(dashboard.revenue)}
            subtitle="All payments received"
            icon={<BarChart3 className="w-5 h-5 text-blue-600" />}
          />
          <MetricCard
            title="Total Expenses"
            value={formatCurrency(dashboard.expenses)}
            subtitle="All business expenses"
            icon={<BarChart3 className="w-5 h-5 text-red-600" />}
          />
          <MetricCard
            title="Net Profit"
            value={formatCurrency(dashboard.profit)}
            subtitle={`${(((dashboard.profit / (dashboard.revenue || 1)) * 100).toFixed(1))}% margin`}
            icon={<BarChart3 className="w-5 h-5 text-green-600" />}
          />
          <MetricCard
            title="Outstanding"
            value={formatCurrency(dashboard.outstanding)}
            subtitle={`${dashboard.overdueInvoices} overdue`}
            icon={<AlertCircle className="w-5 h-5 text-amber-600" />}
          />
        </div>

        {/* Business Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Clients" value={dashboard.clientCount} icon={<Users className="w-5 h-5" />} />
          <StatCard title="Active Projects" value={dashboard.activeProjects} icon={<FolderOpen className="w-5 h-5" />} />
          <StatCard title="FYP Projects" value={dashboard.finalYearProjects} icon={<FolderOpen className="w-5 h-5" />} />
          <StatCard title="Overdue Invoices" value={dashboard.overdueInvoices} icon={<AlertCircle className="w-5 h-5 text-red-600" />} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue vs Expenses Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue vs Expenses</CardTitle>
              <CardDescription>Monthly comparison over the last year</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboard.monthly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" name="Revenue" />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Expenses" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Project Status Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Project Status Distribution</CardTitle>
              <CardDescription>Projects by status</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard.statusBreakdown.length > 0 ? (
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
              ) : (
                <div className="h-80 flex items-center justify-center text-muted-foreground">No projects yet</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Services by Revenue */}
        <Card>
          <CardHeader>
            <CardTitle>Top Services by Revenue</CardTitle>
            <CardDescription>Services with highest project budgets</CardDescription>
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
              <div className="h-80 flex items-center justify-center text-muted-foreground">No service data available</div>
            )}
          </CardContent>
        </Card>

        {/* Profit Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Profit Trend</CardTitle>
            <CardDescription>Monthly profit over time</CardDescription>
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
    </ProtectedRoute>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}

function MetricCard({ title, value, subtitle, icon }: MetricCardProps) {
  const destination = title === "Total Revenue" ? "/payments" : title === "Total Expenses" ? "/expenses" : title === "Outstanding" ? "/invoices" : "/reports";
  return (
    <Link to={destination} className="block rounded-lg transition hover:-translate-y-0.5 hover:shadow-md">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {icon}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
}

function StatCard({ title, value, icon }: StatCardProps) {
  const destination = title === "Total Clients" ? "/clients" : title.includes("Project") ? "/projects" : "/invoices";
  return (
    <Link to={destination} className="block rounded-lg transition hover:-translate-y-0.5 hover:shadow-md">
      <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-slate-600">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
      </Card>
    </Link>
  );
}
