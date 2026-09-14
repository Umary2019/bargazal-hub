import { describe, it } from "node:test";
import assert from "node:assert/strict";

// 1. Invoice & Quotation Calculations
function calculateTotals(
  items: Array<{ quantity: number; unit_price: number }>,
  discountPercentage: number = 0,
  taxPercentage: number = 0
) {
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0),
    0
  );
  const discountAmount = Math.round(((subtotal * discountPercentage) / 100) * 100) / 100;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(((taxableAmount * taxPercentage) / 100) * 100) / 100;
  const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

  return { subtotal, discountAmount, taxAmount, grandTotal };
}

// 2. Installments Generator
function generateInstallments(total: number, count: number, startDateStr: string) {
  if (count <= 0 || total <= 0) return [];
  const baseAmount = Math.floor((total / count) * 100) / 100;
  const installments = [];
  let accumulated = 0;

  const baseDate = new Date(startDateStr);

  for (let i = 1; i <= count; i++) {
    const isLast = i === count;
    const amount = isLast ? Math.round((total - accumulated) * 100) / 100 : baseAmount;
    accumulated += amount;

    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + (i - 1) * 30);

    installments.push({
      installment_number: i,
      amount,
      due_date: dueDate.toISOString().slice(0, 10),
      status: "pending",
    });
  }

  return installments;
}

// 3. Paystack Currency Helpers
function nairaToKobo(naira: number): number {
  if (naira < 0) throw new Error("Amount cannot be negative");
  return Math.round(naira * 100);
}

function koboToNaira(kobo: number): number {
  if (kobo < 0) throw new Error("Kobo cannot be negative");
  return kobo / 100;
}

// 4. Overdue Logic Helper
function isInvoiceOverdue(invoice: {
  status: string;
  total: number;
  amount_paid: number;
  due_date: string | null;
}, referenceDateStr: string): boolean {
  if (invoice.status === "Paid" || invoice.status === "Cancelled") {
    return false;
  }
  const balance = invoice.total - invoice.amount_paid;
  if (balance <= 0) return false;
  if (!invoice.due_date) return false;
  return invoice.due_date < referenceDateStr;
}

// 5. CSV Parsing Helper
function parseCsvSimple(text: string) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const splitLine = (line: string): string[] => {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"' && (i === 0 || line[i - 1] !== "\\")) {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
    return values;
  };

  const headers = splitLine(lines[0] ?? "");
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = splitLine(lines[i] ?? "");
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = vals[idx] ?? "";
    });
    rows.push(obj);
  }
  return rows;
}

// 6. Role Permissions Matrix
const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ["manage_clients", "manage_finances", "manage_staff", "approve_expenses", "system_settings", "view_audit_logs"],
  staff: ["view_assigned_projects", "update_tasks", "view_invoices", "create_expense"],
  client: ["view_own_portal", "pay_invoice", "request_service", "download_deliverables"],
};

function hasPermission(role: string, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

// -------------------------------------------------------------
// Test Suites
// -------------------------------------------------------------

describe("Financial & Invoice Calculations", () => {
  it("calculates exact subtotal with multiple line items", () => {
    const items = [
      { quantity: 2, unit_price: 50000 },
      { quantity: 1, unit_price: 150000 },
      { quantity: 3, unit_price: 25000 },
    ];
    const { subtotal, grandTotal } = calculateTotals(items, 0, 0);
    assert.equal(subtotal, 325000);
    assert.equal(grandTotal, 325000);
  });

  it("accurately applies discount before calculating tax", () => {
    const items = [{ quantity: 1, unit_price: 100000 }];
    const { subtotal, discountAmount, taxAmount, grandTotal } = calculateTotals(items, 10, 7.5);
    assert.equal(subtotal, 100000);
    assert.equal(discountAmount, 10000);
    // 7.5% of 90,000 = 6,750
    assert.equal(taxAmount, 6750);
    assert.equal(grandTotal, 96750);
  });

  it("handles zero items without errors", () => {
    const { subtotal, grandTotal } = calculateTotals([]);
    assert.equal(subtotal, 0);
    assert.equal(grandTotal, 0);
  });
});

describe("Installments Splitting Engine", () => {
  it("generates exactly N installments summing strictly to invoice total", () => {
    const total = 100000;
    const count = 3;
    const installments = generateInstallments(total, count, "2026-09-01");

    assert.equal(installments.length, 3);
    const sum = installments.reduce((acc, curr) => acc + curr.amount, 0);
    assert.equal(Math.round(sum * 100) / 100, total);
  });

  it("correctly absorbs penny rounding discrepancy into the final installment", () => {
    // 100 / 3 = 33.3333...
    const total = 100;
    const installments = generateInstallments(total, 3, "2026-09-01");

    assert.equal(installments[0]?.amount, 33.33);
    assert.equal(installments[1]?.amount, 33.33);
    assert.equal(installments[2]?.amount, 33.34);

    const sum = installments.reduce((acc, curr) => acc + curr.amount, 0);
    assert.equal(sum, 100);
  });

  it("sets 30-day sequential due dates", () => {
    const installments = generateInstallments(60000, 2, "2026-09-01");
    assert.equal(installments[0]?.due_date, "2026-09-01");
    assert.equal(installments[1]?.due_date, "2026-10-01");
  });
});

describe("Paystack Payment Conversion & Reference Helpers", () => {
  it("converts Naira to Kobo accurately", () => {
    assert.equal(nairaToKobo(1500), 150000);
    assert.equal(nairaToKobo(250.75), 25075);
    assert.equal(nairaToKobo(0), 0);
  });

  it("converts Kobo back to Naira accurately", () => {
    assert.equal(koboToNaira(150000), 1500);
    assert.equal(koboToNaira(25075), 250.75);
  });

  it("throws on negative amounts", () => {
    assert.throws(() => nairaToKobo(-50), /Amount cannot be negative/);
  });
});

describe("Overdue Detection Engine", () => {
  const today = "2026-09-14";

  it("flags unpaid invoice past due date as overdue", () => {
    const inv = {
      status: "Sent",
      total: 50000,
      amount_paid: 0,
      due_date: "2026-09-10",
    };
    assert.equal(isInvoiceOverdue(inv, today), true);
  });

  it("does not flag partially paid invoice if due date is in the future", () => {
    const inv = {
      status: "Partially Paid",
      total: 50000,
      amount_paid: 20000,
      due_date: "2026-09-20",
    };
    assert.equal(isInvoiceOverdue(inv, today), false);
  });

  it("never flags Paid invoices as overdue", () => {
    const inv = {
      status: "Paid",
      total: 50000,
      amount_paid: 50000,
      due_date: "2026-08-01",
    };
    assert.equal(isInvoiceOverdue(inv, today), false);
  });

  it("never flags Cancelled invoices as overdue", () => {
    const inv = {
      status: "Cancelled",
      total: 50000,
      amount_paid: 0,
      due_date: "2026-08-01",
    };
    assert.equal(isInvoiceOverdue(inv, today), false);
  });
});

describe("CSV Export & RFC Parsing", () => {
  it("parses CSV with quoted values containing commas", () => {
    const csvData = `full_name,email,notes\n"Jane Doe, Esq.",jane@example.com,"Note with, comma"\n"John Smith",john@example.com,"Single note"`;
    const parsed = parseCsvSimple(csvData);

    assert.equal(parsed.length, 2);
    assert.equal(parsed[0]?.full_name, "Jane Doe, Esq.");
    assert.equal(parsed[0]?.notes, "Note with, comma");
    assert.equal(parsed[1]?.full_name, "John Smith");
  });
});

describe("Role-Based Access Control Security Matrix", () => {
  it("grants admin full system governance capabilities", () => {
    assert.equal(hasPermission("admin", "manage_finances"), true);
    assert.equal(hasPermission("admin", "approve_expenses"), true);
    assert.equal(hasPermission("admin", "view_audit_logs"), true);
  });

  it("restricts staff from sensitive admin capabilities", () => {
    assert.equal(hasPermission("staff", "manage_staff"), false);
    assert.equal(hasPermission("staff", "approve_expenses"), false);
    assert.equal(hasPermission("staff", "system_settings"), false);
    assert.equal(hasPermission("staff", "view_assigned_projects"), true);
  });

  it("restricts client to portal features only", () => {
    assert.equal(hasPermission("client", "manage_finances"), false);
    assert.equal(hasPermission("client", "manage_clients"), false);
    assert.equal(hasPermission("client", "pay_invoice"), true);
    assert.equal(hasPermission("client", "view_own_portal"), true);
  });
});
