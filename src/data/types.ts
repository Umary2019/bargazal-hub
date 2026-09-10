import type { Database } from "@/integrations/supabase/types";

type T = Database["public"]["Tables"];

export type Client = T["clients"]["Row"];
export type ClientInput = T["clients"]["Insert"];
export type ServiceCategory = T["service_categories"]["Row"];
export type Service = T["services"]["Row"];
export type ServiceInput = T["services"]["Insert"];
export type Project = T["projects"]["Row"];
export type ProjectInput = T["projects"]["Insert"];
export type Invoice = T["invoices"]["Row"];
export type InvoiceInput = T["invoices"]["Insert"];
export type InvoiceItem = T["invoice_items"]["Row"];
export type Payment = T["payments"]["Row"];
export type PaymentInput = T["payments"]["Insert"];
export type Expense = T["expenses"]["Row"];
export type ExpenseInput = T["expenses"]["Insert"];
export type BusinessSettings = T["business_settings"]["Row"];

export type ServiceWithCategory = Service & { service_categories: ServiceCategory | null };
export type ProjectWithRelations = Project & {
  clients: Pick<Client, "id" | "full_name"> | null;
  services: Pick<Service, "id" | "name"> | null;
};
export type InvoiceWithRelations = Invoice & {
  clients: (Pick<Client, "id" | "full_name"> & {
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
  }) | null;
  projects: (Pick<Project, "id" | "title" | "project_number"> & {
    service_id?: string | null;
    services?: Pick<Service, "id" | "name"> | null;
  }) | null;
  payments?: Payment[] | null;
  service_requests?: { id: string; title: string; status: string } | null;
};
export type PaymentWithRelations = Payment & {
  clients: Pick<Client, "id" | "full_name"> | null;
  invoices: Pick<Invoice, "id" | "invoice_number"> | null;
  projects: Pick<Project, "id" | "title"> | null;
};
