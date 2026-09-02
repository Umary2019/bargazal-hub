import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/landing")({
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [session, loading, navigate]);

  const companyLogoUrl = "/company-logo.png";

  const features = [
    {
      icon: Users,
      title: "CRM that acts like your team",
      description:
        "Store client profiles, track conversations, and keep every relationship organized from first enquiry to final payment.",
    },
    {
      icon: FileText,
      title: "Invoices, payments, and billing",
      description:
        "Create polished invoices, record payments instantly, and keep your cash flow visible with accurate balance tracking.",
    },
    {
      icon: BriefcaseBusiness,
      title: "Projects delivered on time",
      description:
        "Track progress, manage deadlines, and monitor project health from kickoff to completion without spreadsheet chaos.",
    },
    {
      icon: BarChart3,
      title: "Financial intelligence",
      description:
        "See revenue, expenses, profit trends, and business health in a single live dashboard designed for decision-making.",
    },
    {
      icon: ShieldCheck,
      title: "Secure by default",
      description:
        "Built with authentication, access rules, and a clean governance model that gives your leadership confidence.",
    },
    {
      icon: TrendingUp,
      title: "Built for growth",
      description:
        "Replace manual work with repeatable workflows so your team grows faster, more efficiently, and with less friction.",
    },
  ];

  const capabilities = [
    "Lead and client management",
    "Project lifecycle tracking",
    "Invoice and payment monitoring",
    "Expense and revenue analytics",
    "Fast executive dashboard reporting",
    "Operational control for the whole business",
  ];

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img
              src={companyLogoUrl}
              alt="Bargazal and Sons Tech Solution logo"
              className="h-11 w-11 rounded-2xl object-cover ring-2 ring-slate-200/80 shadow-sm"
            />
            <div>
              <div className="text-lg font-black tracking-tight text-slate-900">
                Bargazal and Sons
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Tech Solution
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              Features
            </a>
            <a
              href="#solutions"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              Solutions
            </a>
            <a
              href="#about"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              About
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              className="hidden sm:inline-flex"
              onClick={() => navigate({ to: "/login" })}
            >
              Login
            </Button>
            <Button
              className="bg-slate-950 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800"
              onClick={() => navigate({ to: "/login" })}
            >
              Open Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_30%),linear-gradient(135deg,#0f172a_0%,#111827_35%,#0b1220_100%)] text-white">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-28">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-slate-200 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-amber-300" />
                Built for serious businesses
              </div>

              <h1 className="max-w-xl text-4xl font-black tracking-tight sm:text-5xl lg:text-7xl">
                Run your business with clarity, speed, and control.
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
                Bargazal and Sons Tech Solution brings your clients, projects, billing, payments,
                expenses, and reports into one premium business software built for daily operations
                and growth.
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Button
                  size="lg"
                  className="bg-amber-400 text-slate-950 hover:bg-amber-300"
                  onClick={() => navigate({ to: "/login" })}
                >
                  Access Platform
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                  onClick={() => navigate({ to: "/login" })}
                >
                  Sign In
                </Button>
              </div>

              <div className="mt-10 grid max-w-lg grid-cols-3 gap-4">
                {[
                  { value: "100%", label: "Centralized" },
                  { value: "24/7", label: "Visibility" },
                  { value: "1 hub", label: "Operations" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
                  >
                    <div className="text-2xl font-black text-amber-300">{item.value}</div>
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-300">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-8 rounded-[2rem] bg-gradient-to-br from-amber-400/20 via-cyan-400/10 to-transparent blur-3xl" />
              <div className="relative rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-slate-950/30 backdrop-blur-lg">
                <div className="rounded-[1.5rem] border border-slate-700 bg-slate-950 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        Executive Overview
                      </div>
                      <div className="mt-1 text-xl font-bold text-white">Performance Summary</div>
                    </div>
                    <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">
                      +18.4%
                    </div>
                  </div>

                  <div className="space-y-4">
                    {[
                      { label: "Revenue", value: "₦14.8M", color: "text-emerald-300" },
                      { label: "Expenses", value: "₦6.1M", color: "text-amber-300" },
                      { label: "Outstanding", value: "₦2.7M", color: "text-sky-300" },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="rounded-2xl border border-slate-800 bg-slate-900/90 p-3"
                      >
                        <div className="flex items-center justify-between text-sm text-slate-400">
                          <span>{row.label}</span>
                          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-slate-300">
                            Live
                          </span>
                        </div>
                        <div className={`mt-2 text-2xl font-black ${row.color}`}>{row.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-3">
                    <div className="mb-3 flex items-center justify-between text-sm text-slate-300">
                      <span>Monthly trend</span>
                      <span className="text-emerald-300">Healthy</span>
                    </div>
                    <div className="flex items-end gap-2">
                      {[45, 62, 58, 71, 84, 92].map((height, index) => (
                        <div
                          key={index}
                          className="flex-1 rounded-t-xl bg-gradient-to-t from-amber-400 to-cyan-400"
                          style={{ height: `${height}px` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Core capabilities
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Built to manage the full business lifecycle.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/60 transition duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/80"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-200">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-slate-900">{title}</h3>
                <p className="text-base leading-7 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="solutions" className="bg-slate-900 py-20 text-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                <Building2 className="h-3.5 w-3.5 text-amber-300" />
                Why leaders choose it
              </div>
              <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                One platform for operations, reporting, and execution.
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
                Whether you are tracking client work, managing project delivery, or monitoring cash
                flow, the system helps your team move from scattered tools to a single source of
                truth.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {capabilities.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-400" />
                  <span className="text-base font-medium text-slate-200">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-lg shadow-slate-300/40 sm:p-12">
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                  <CreditCard className="h-3.5 w-3.5 text-amber-300" />
                  Complete business control
                </div>
                <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                  Designed for a business that needs to look premium and run cleanly.
                </h2>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="mb-3 text-3xl font-black text-amber-300">₦</div>
                <div className="text-xl font-bold">Finance & operations</div>
                <p className="mt-3 text-slate-300">
                  From project budgets to payment records and expense tracking, every financial
                  detail remains visible and ready for action.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <img
              src={companyLogoUrl}
              alt="Bargazal and Sons Tech Solution logo"
              className="h-10 w-10 rounded-xl object-cover ring-1 ring-slate-200"
            />
            <div>
              <div className="text-lg font-black text-slate-900">
                Bargazal and Sons Tech Solution
              </div>
              <div className="text-sm text-slate-500">
                Operational excellence for modern businesses.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="mailto:contact@bargazal.com?subject=Privacy%20request"
              className="transition hover:text-slate-900"
            >
              Privacy
            </a>
            <a href="mailto:support@bargazal.com" className="transition hover:text-slate-900">
              Support
            </a>
            <a href="mailto:contact@bargazal.com" className="transition hover:text-slate-900">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
