import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Users,
  FileText,
  FolderOpen,
  CreditCard,
  Search,
  LayoutDashboard,
  Briefcase,
  TrendingDown,
  BarChart,
  Settings,
  ClipboardList,
  Loader2,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";

interface SearchResult {
  id: string;
  type: "client" | "invoice" | "project" | "payment";
  title: string;
  subtitle: string;
  url: string;
}

interface GlobalSearchDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GlobalSearchDialog({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: GlobalSearchDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = (next: boolean) => {
    if (isControlled) {
      setControlledOpen?.(next);
    } else {
      setInternalOpen(next);
    }
  };

  // Keyboard shortcut listener: Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const q = query.trim();
      try {
        const [clientsRes, invoicesRes, projectsRes, paymentsRes] = await Promise.all([
          supabase
            .from("clients")
            .select("id, full_name, email, phone")
            .or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
            .limit(5),
          supabase
            .from("invoices")
            .select("id, invoice_number, total, status")
            .ilike("invoice_number", `%${q}%`)
            .limit(5),
          supabase
            .from("projects")
            .select("id, title, status, project_number")
            .ilike("title", `%${q}%`)
            .limit(5),
          supabase
            .from("payments")
            .select("id, payment_number, amount, payment_method")
            .ilike("payment_number", `%${q}%`)
            .limit(5),
        ]);

        const aggregated: SearchResult[] = [];

        (clientsRes.data ?? []).forEach((c) => {
          aggregated.push({
            id: c.id,
            type: "client",
            title: c.full_name,
            subtitle: c.email || c.phone || "Client",
            url: `/clients/${c.id}`,
          });
        });

        (invoicesRes.data ?? []).forEach((inv) => {
          aggregated.push({
            id: inv.id,
            type: "invoice",
            title: `Invoice #${inv.invoice_number}`,
            subtitle: `₦${Number(inv.total).toLocaleString()} • ${inv.status}`,
            url: `/invoices/${inv.id}`,
          });
        });

        (projectsRes.data ?? []).forEach((p) => {
          aggregated.push({
            id: p.id,
            type: "project",
            title: p.title,
            subtitle: `Project #${p.project_number} • ${p.status}`,
            url: `/projects/${p.id}`,
          });
        });

        (paymentsRes.data ?? []).forEach((pm) => {
          aggregated.push({
            id: pm.id,
            type: "payment",
            title: `Payment #${pm.payment_number}`,
            subtitle: `₦${Number(pm.amount).toLocaleString()} • ${pm.payment_method}`,
            url: `/payments`,
          });
        });

        setResults(aggregated);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (url: string) => {
    setIsOpen(false);
    setQuery("");
    navigate({ to: url as never });
  };

  const clients = results.filter((r) => r.type === "client");
  const invoices = results.filter((r) => r.type === "invoice");
  const projects = results.filter((r) => r.type === "project");
  const payments = results.filter((r) => r.type === "payment");

  return (
    <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
      <CommandInput
        placeholder="Search clients, invoices, projects, payments..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {searching && (
          <div className="flex items-center justify-center p-4 text-sm text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Searching across database...
          </div>
        )}

        {!searching && query.trim() !== "" && results.length === 0 && (
          <CommandEmpty>No matching records found for "{query}".</CommandEmpty>
        )}

        {clients.length > 0 && (
          <CommandGroup heading="Clients">
            {clients.map((c) => (
              <CommandItem
                key={c.id}
                value={`${c.title} ${c.subtitle}`}
                onSelect={() => handleSelect(c.url)}
                className="cursor-pointer"
              >
                <Users className="w-4 h-4 mr-2 text-blue-500" />
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{c.title}</span>
                  <span className="text-xs text-muted-foreground">{c.subtitle}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {invoices.length > 0 && (
          <CommandGroup heading="Invoices">
            {invoices.map((inv) => (
              <CommandItem
                key={inv.id}
                value={`${inv.title} ${inv.subtitle}`}
                onSelect={() => handleSelect(inv.url)}
                className="cursor-pointer"
              >
                <FileText className="w-4 h-4 mr-2 text-amber-500" />
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{inv.title}</span>
                  <span className="text-xs text-muted-foreground">{inv.subtitle}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {projects.length > 0 && (
          <CommandGroup heading="Projects">
            {projects.map((p) => (
              <CommandItem
                key={p.id}
                value={`${p.title} ${p.subtitle}`}
                onSelect={() => handleSelect(p.url)}
                className="cursor-pointer"
              >
                <FolderOpen className="w-4 h-4 mr-2 text-indigo-500" />
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{p.title}</span>
                  <span className="text-xs text-muted-foreground">{p.subtitle}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {payments.length > 0 && (
          <CommandGroup heading="Payments">
            {payments.map((pm) => (
              <CommandItem
                key={pm.id}
                value={`${pm.title} ${pm.subtitle}`}
                onSelect={() => handleSelect(pm.url)}
                className="cursor-pointer"
              >
                <CreditCard className="w-4 h-4 mr-2 text-emerald-500" />
                <div className="flex flex-col">
                  <span className="font-medium text-sm">{pm.title}</span>
                  <span className="text-xs text-muted-foreground">{pm.subtitle}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {query.trim() === "" && (
          <>
            <CommandGroup heading="Quick Navigation">
              <CommandItem onSelect={() => handleSelect("/dashboard")} className="cursor-pointer">
                <LayoutDashboard className="w-4 h-4 mr-2 text-slate-500" />
                <span>Dashboard</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect("/clients")} className="cursor-pointer">
                <Users className="w-4 h-4 mr-2 text-slate-500" />
                <span>Clients CRM</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect("/invoices")} className="cursor-pointer">
                <FileText className="w-4 h-4 mr-2 text-slate-500" />
                <span>Invoices</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect("/quotes")} className="cursor-pointer">
                <ClipboardList className="w-4 h-4 mr-2 text-slate-500" />
                <span>Quotations</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect("/payments")} className="cursor-pointer">
                <CreditCard className="w-4 h-4 mr-2 text-slate-500" />
                <span>Payment Center</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect("/expenses")} className="cursor-pointer">
                <TrendingDown className="w-4 h-4 mr-2 text-slate-500" />
                <span>Expense Management</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect("/services")} className="cursor-pointer">
                <Briefcase className="w-4 h-4 mr-2 text-slate-500" />
                <span>Services Catalog</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect("/reports")} className="cursor-pointer">
                <BarChart className="w-4 h-4 mr-2 text-slate-500" />
                <span>Reports & Analytics</span>
              </CommandItem>
              <CommandItem onSelect={() => handleSelect("/settings")} className="cursor-pointer">
                <Settings className="w-4 h-4 mr-2 text-slate-500" />
                <span>Settings & Security</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
