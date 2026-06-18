import { formatCurrency } from "@/lib/api/deals";

export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

export function formatDashboardCurrency(
  value: string | number | null | undefined,
  currency = "USD",
): string {
  const num = toNumber(value);
  if (num === 0 && (value === null || value === undefined || value === "")) return "—";
  return formatCurrency(String(num), currency);
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
