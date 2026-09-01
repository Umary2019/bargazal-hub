import type { Database } from "@/integrations/supabase/types";

type Enums = Database["public"]["Enums"];

export const PROJECT_STATUSES: Enums["project_status"][] = [
  "Pending",
  "Planning",
  "Requirements",
  "Design",
  "Development",
  "Testing",
  "Client Review",
  "Completed",
  "Cancelled",
];

export const PROJECT_PRIORITIES: Enums["project_priority"][] = ["Low", "Medium", "High", "Urgent"];

export const INVOICE_STATUSES: Enums["invoice_status"][] = [
  "Draft",
  "Sent",
  "Partially Paid",
  "Paid",
  "Overdue",
  "Cancelled",
];

export const PAYMENT_METHODS: Enums["payment_method"][] = [
  "Cash",
  "Bank Transfer",
  "POS",
  "Online Payment",
  "Other",
];

export const PRICING_TYPES: Enums["pricing_type"][] = ["Fixed", "Starting From", "Hourly", "Custom"];

export const SERVICE_STATUSES: Enums["service_status"][] = ["Active", "Inactive"];

export const EXPENSE_CATEGORIES = [
  "Internet",
  "Hosting",
  "Domain",
  "Transportation",
  "Equipment",
  "Software",
  "Marketing",
  "Office",
  "Utilities",
  "Maintenance",
  "Other",
] as const;

export const ACTIVE_PROJECT_STATUSES: Enums["project_status"][] = [
  "Planning",
  "Requirements",
  "Design",
  "Development",
  "Testing",
  "Client Review",
];

export const PAGE_SIZE = 10;
