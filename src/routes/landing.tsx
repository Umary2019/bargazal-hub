import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Receipt,
  ShieldCheck,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/landing")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Bargazal & Sons Tech Solution | Business Management Software" },
      {
        name: "description",
        content:
          "Manage clients, final year projects, invoices, payments, expenses and reports in one Naira-ready business platform built for Bargazal & Sons Tech Solution.",
      },
      {
        property: "og:title",
        content: "Bargazal & Sons Tech Solution — Business Management Software",
      },
      {
        property: "og:description",
        content:
          "One platform for clients, projects, invoicing, payments, expenses and financial reporting.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const navLinks = [
  { label: "Platform", href: "#platform" },
  { label: "FYP Module", href: "#fyp" },
  { label: "Workflow", href: "#workflow" },
  { label: "Contact", href: "#contact" },
];

const modules = [
  {
    icon: Users,
    title: "Client management",
    description:
      "Full client records with contact details, project history and outstanding balances at a glance.",
  },
  {
    icon: GraduationCap,
    title: "Final year projects",
    description:
      "Chapter-by-chapter tracking, software builds, supervisor milestones and delivery progress.",
  },
  {
    icon: FileText,
    title: "Invoicing",
    description:
      "Auto-numbered invoices with line items, tax handling and printable Naira statements.",
  },
  {
    icon: CreditCard,
    title: "Payments",
    description:
      "Record cash, transfer or POS payments and watch invoice balances update automatically.",
  },
  {
    icon: Wallet,
    title: "Expenses",
    description:
      "Log operating costs by category so profit is calculated from real numbers, not guesses.",
  },
  {
    icon: BarChart3,
    title: "Reports",
    description:
      "Revenue, expenses and profit trends with period filters ready for management review.",
  },
];

const workflow = [
  {
    step: "01",
    title: "Register the client",
    body: "Capture the client once and reuse the record across every project and invoice.",
  },
  {
    step: "02",
    title: "Open the project",
    body: "Attach services or FYP chapters, set the deadline and track progress to completion.",
  },
  {
    step: "03",
    title: "Invoice and collect",
    body: "Generate the invoice, record part payments and monitor the outstanding balance.",
  },
  {
    step: "04",
    title: "Review performance",
    body: "Expenses roll into reports so you always know what the business actually earned.",
  },
];

function Landing() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [session, loading, navigate]);

  const goToLogin = () => navigate({ to: "/login" });
  const goToRegister = () => navigate({ to: "/register" });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <a href="#top" className="flex items-center gap-2.5">
            <img
              src="/company-logo.png"
              alt="Bargazal and Sons Tech Solution logo"
              className="h-9 w-9 rounded-lg object-cover ring-1 ring-border"
            />
            <span className="leading-tight">
              <span className="block text-sm font-semibold tracking-tight">
                Bargazal &amp; Sons
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                Tech Solution
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={goToLogin}>
              Sign in
            </Button>
            <Button size="sm" onClick={goToRegister} className="gap-1.5">
              Register
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <button
              type="button"
              aria-label="Toggle menu"
              className="rounded-md p-2 text-muted-foreground md:hidden"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-border bg-background px-4 py-3 md:hidden">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-md px-2 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}
      </header>

      <main id="top">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-border bg-primary text-primary-foreground">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
              backgroundSize: "48px 48px",
            }}
          />
          <div className="relative mx-auto grid max-w-6xl gap-14 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1fr] lg:items-center lg:py-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs font-medium tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                Internal business platform · v1.0
              </span>

              <h1 className="mt-6 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
                The operating system for{" "}
                <span className="text-accent">Bargazal &amp; Sons Tech Solution</span>
              </h1>

              <p className="mt-5 max-w-lg text-base leading-7 text-primary-foreground/75">
                Clients, final year projects, invoices, payments and expenses in one secure
                workspace — with every figure in Naira and every report ready when you need it.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  onClick={goToRegister}
                  className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
                >
                  Register as a Client
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={goToLogin}
                  className="border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                >
                  Sign in to Portal
                </Button>
              </div>

              <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-primary-foreground/15 pt-6">
                {[
                  { k: "9", v: "Connected modules" },
                  { k: "₦", v: "Naira-native billing" },
                  { k: "RLS", v: "Row-level security" },
                ].map((s) => (
                  <div key={s.v}>
                    <dt className="text-2xl font-semibold text-accent">{s.k}</dt>
                    <dd className="mt-1 text-xs leading-4 text-primary-foreground/65">{s.v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* App preview */}
            <div className="relative">
              <div className="overflow-hidden rounded-xl border border-primary-foreground/15 bg-card text-card-foreground shadow-2xl">
                <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
                  <span className="ml-3 truncate text-[11px] text-muted-foreground">
                    dashboard · Bargazal &amp; Sons
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[132px_1fr]">
                  <aside className="hidden border-r border-border bg-secondary/60 p-3 sm:block">
                    {[
                      { icon: LayoutDashboard, label: "Dashboard", active: true },
                      { icon: Users, label: "Clients" },
                      { icon: GraduationCap, label: "Projects" },
                      { icon: FileText, label: "Invoices" },
                      { icon: Receipt, label: "Expenses" },
                      { icon: BarChart3, label: "Reports" },
                    ].map(({ icon: Icon, label, active }) => (
                      <div
                        key={label}
                        className={`mb-1 flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium ${
                          active ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </div>
                    ))}
                  </aside>

                  <div className="p-4">
                    <div className="grid grid-cols-1 gap-2.5 min-[360px]:grid-cols-3">
                      {[
                        { label: "Revenue", value: "₦14,850,000", tone: "text-success" },
                        { label: "Outstanding", value: "₦2,740,000", tone: "text-warning" },
                        { label: "Expenses", value: "₦6,120,000", tone: "text-info" },
                      ].map((c) => (
                        <div key={c.label} className="rounded-lg border border-border p-2.5">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                            {c.label}
                          </div>
                          <div className={`mt-1 text-xs font-semibold ${c.tone}`}>{c.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 rounded-lg border border-border p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-[11px] font-medium">Monthly revenue</span>
                        <span className="rounded-full bg-success/12 px-2 py-0.5 text-[10px] font-medium text-success">
                          +18.4%
                        </span>
                      </div>
                      <div className="flex h-24 items-end gap-1.5">
                        {[38, 52, 44, 63, 57, 78, 71, 92].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-sm bg-primary/85"
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg border border-border">
                      {[
                        { n: "BTS-INV-2026-014", c: "Aminu Bala", a: "₦185,000", s: "Paid" },
                        { n: "BTS-INV-2026-013", c: "Zainab Yusuf", a: "₦240,000", s: "Partial" },
                        { n: "BTS-INV-2026-012", c: "Grace Okon", a: "₦95,000", s: "Unpaid" },
                      ].map((r, i) => (
                        <div
                          key={r.n}
                          className={`flex items-center justify-between px-3 py-2 text-[11px] ${
                            i > 0 ? "border-t border-border" : ""
                          }`}
                        >
                          <span className="font-mono text-muted-foreground">{r.n}</span>
                          <span className="hidden sm:inline">{r.c}</span>
                          <span className="font-medium">{r.a}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] ${
                              r.s === "Paid"
                                ? "bg-success/12 text-success"
                                : r.s === "Partial"
                                  ? "bg-warning/15 text-warning"
                                  : "bg-destructive/12 text-destructive"
                            }`}
                          >
                            {r.s}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Modules */}
        <section id="platform" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              The platform
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Every part of the business, connected
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              No more scattered notebooks and spreadsheets. Each module feeds the next, so a
              recorded payment instantly updates the invoice, the project and the reports.
            </p>
          </div>

          <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            {modules.map(({ icon: Icon, title, description }) => (
              <div key={title} className="bg-card p-6 transition-colors hover:bg-secondary/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/8 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FYP module */}
        <section id="fyp" className="border-y border-border bg-secondary/40">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                Specialist module
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Final year projects, tracked chapter by chapter
              </h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">
                Built around how the business actually delivers student work: chapters, software
                development, documentation and defence support — each with its own price, status and
                progress.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Chapter One to Five tracked independently",
                  "Software build, proposal and defence slides as billable services",
                  "Progress percentage rolls up to the project dashboard",
                  "Deadline alerts before submission dates",
                ].map((item) => (
                  <li key={item} className="flex gap-3 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <div className="text-sm font-semibold">BTS-PROJ-0042</div>
                  <div className="text-xs text-muted-foreground">
                    Hostel Allocation System · Aminu Bala
                  </div>
                </div>
                <span className="rounded-full bg-warning/15 px-2.5 py-1 text-[11px] font-medium text-warning">
                  In progress
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {[
                  { name: "Chapter One — Introduction", pct: 100 },
                  { name: "Chapter Two — Literature Review", pct: 100 },
                  { name: "Chapter Three — Methodology", pct: 70 },
                  { name: "Software Development", pct: 45 },
                  { name: "Defence Slides", pct: 0 },
                ].map((c) => (
                  <div key={c.name}>
                    <div className="flex items-center justify-between text-xs">
                      <span>{c.name}</span>
                      <span className="text-muted-foreground">{c.pct}%</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${c.pct === 100 ? "bg-success" : "bg-accent"}`}
                        style={{ width: `${c.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-border pt-4 text-sm">
                <span className="text-muted-foreground">Balance due</span>
                <span className="font-semibold">₦120,000</span>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section id="workflow" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              From first enquiry to final report
            </h2>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {workflow.map((s) => (
              <div key={s.step} className="border-t-2 border-accent pt-5">
                <div className="font-mono text-xs text-muted-foreground">{s.step}</div>
                <h3 className="mt-2 text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section id="contact" className="border-t border-border bg-primary text-primary-foreground">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Ready to run the business from one place?
              </h2>
              <p className="mt-3 text-sm leading-6 text-primary-foreground/75">
                Sign in with your staff account to access the dashboard. Access is restricted and
                every action is recorded in the activity log.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={goToLogin}
                className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                Sign in
                <ArrowRight className="h-4 w-4" />
              </Button>
              <span className="inline-flex items-center gap-2 rounded-md border border-primary-foreground/20 px-4 py-2 text-xs text-primary-foreground/75">
                <ShieldCheck className="h-4 w-4 text-accent" />
                Secured with role-based access
              </span>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2.5">
            <img
              src="/company-logo.png"
              alt=""
              className="h-7 w-7 rounded-md object-cover ring-1 ring-border"
            />
            <span className="font-medium text-foreground">Bargazal &amp; Sons Tech Solution</span>
          </div>
          <p>
            © {new Date().getFullYear()} Bargazal &amp; Sons Tech Solution. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
