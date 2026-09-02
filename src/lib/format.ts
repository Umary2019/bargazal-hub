export const CURRENCY_SYMBOL = "₦";

/** Format a monetary value in Nigerian Naira. */
export function formatMoney(value: number | string | null | undefined): string {
  const amount = toNumber(value);
  return (
    CURRENCY_SYMBOL +
    amount.toLocaleString("en-NG", {
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    })
  );
}

/** Alias for formatMoney */
export const formatCurrency = formatMoney;

/** Compact money for chart axes, e.g. ₦1.2M */
export function formatMoneyShort(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${CURRENCY_SYMBOL}${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${CURRENCY_SYMBOL}${Math.round(value / 1_000)}k`;
  return `${CURRENCY_SYMBOL}${value}`;
}

export function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${formatDate(value)} · ${date.toLocaleTimeString("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
