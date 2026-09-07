import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Menu,
  X,
  LogOut,
  BarChart3,
  Users,
  Briefcase,
  FolderOpen,
  FileText,
  CreditCard,
  TrendingDown,
  BarChart,
  Settings,
  ClipboardList,
  UserPlus,
  Inbox,
  LayoutDashboard,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth, type PortalRole } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/app/theme-toggle";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: Exclude<PortalRole, null>[];
}

interface AppLayoutProps {
  children: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <BarChart3 className="w-5 h-5" />, roles: ["admin"] },
  { label: "My Work", href: "/staff", icon: <LayoutDashboard className="w-5 h-5" />, roles: ["staff"] },
  { label: "My Portal", href: "/portal", icon: <LayoutDashboard className="w-5 h-5" />, roles: ["client"] },
  { label: "Requests", href: "/requests", icon: <Inbox className="w-5 h-5" />, roles: ["admin"] },
  { label: "Clients", href: "/clients", icon: <Users className="w-5 h-5" />, roles: ["admin"] },
  { label: "Services", href: "/services", icon: <Briefcase className="w-5 h-5" />, roles: ["admin"] },
  { label: "Projects", href: "/projects", icon: <FolderOpen className="w-5 h-5" />, roles: ["admin"] },
  { label: "Invoices", href: "/invoices", icon: <FileText className="w-5 h-5" />, roles: ["admin", "staff"] },
  { label: "Quotations", href: "/quotes", icon: <ClipboardList className="w-5 h-5" />, roles: ["admin"] },
  { label: "Payments", href: "/payments", icon: <CreditCard className="w-5 h-5" />, roles: ["admin", "staff"] },
  { label: "Expenses", href: "/expenses", icon: <TrendingDown className="w-5 h-5" />, roles: ["admin"] },
  { label: "Reports", href: "/reports", icon: <BarChart className="w-5 h-5" />, roles: ["admin"] },
  { label: "Staff", href: "/team", icon: <UserPlus className="w-5 h-5" />, roles: ["admin"] },
  { label: "Settings", href: "/settings", icon: <Settings className="w-5 h-5" />, roles: ["admin"] },
];

const roleLabel: Record<string, string> = {
  admin: "Administrator",
  staff: "Staff",
  client: "Client",
};

export function AppLayout({ children }: AppLayoutProps) {
  const { session, fullName, role, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      await signOut();
      toast.success("Logged out successfully");
      navigate({ to: "/login" });
    } catch (err) {
      toast.error("Failed to logout");
      console.error(err);
    }
  };

  if (!session) {
    return <>{children}</>;
  }

  const visibleNav = navItems.filter((item) => (role ? item.roles.includes(role) : false));
  const homeHref = role === "client" ? "/portal" : role === "staff" ? "/staff" : "/dashboard";

  return (
    <div className="flex h-screen min-w-0 bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          isMobile
            ? "fixed inset-y-0 left-0 z-40 w-[min(18rem,85vw)] bg-slate-900 transition-transform"
            : "w-64 shrink-0 border-r"
        } ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} print:hidden`}
      >
        <div id="app-navigation" className="flex flex-col h-full">
          {/* Logo */}
          <div className="border-b px-4 py-4 sm:px-6">
            <Link to={homeHref} className="flex items-center gap-2">
              <img
                src="/company-logo.png"
                alt="Bargazal and Sons Tech Solution logo"
                className="h-8 w-8 rounded-lg object-cover"
              />
              <div>
                <h1 className="font-bold text-lg">Bargazal and Sons</h1>
                <p className="text-xs text-muted-foreground">Business Software</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
            {visibleNav.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === item.href
                    ? "bg-blue-600 text-white"
                    : "text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
                onClick={() => isMobile && setSidebarOpen(false)}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* User Section */}
          <div className="border-t p-4 space-y-2">
            <div className="px-2 py-1">
              <p className="text-sm font-medium">{fullName || session?.user?.email}</p>
              <p className="text-xs text-muted-foreground">
                {role ? roleLabel[role] : "Pending access"}
              </p>
            </div>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-background print:hidden">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6">
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={sidebarOpen}
                aria-controls="app-navigation"
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
            <div className="flex-1" />
            <ThemeToggle />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto min-w-0 px-4 py-5 sm:p-6">{children}</div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
