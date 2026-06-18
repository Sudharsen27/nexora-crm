import { apiFetch } from "@/lib/api/client";
import type { DashboardFilters, DashboardResponse } from "@/types/dashboard";

function buildQuery(filters: DashboardFilters): string {
  const params = new URLSearchParams();
  params.set("range", filters.range);
  params.set("scope", filters.scope);
  if (filters.start_date) params.set("start_date", filters.start_date);
  if (filters.end_date) params.set("end_date", filters.end_date);
  if (filters.timezone) params.set("timezone", filters.timezone);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function getDashboard(
  slug: string,
  filters: DashboardFilters,
): Promise<DashboardResponse> {
  return apiFetch<DashboardResponse>(`/tenants/${slug}/dashboard${buildQuery(filters)}`);
}

export const DASHBOARD_RANGE_LABELS: Record<string, string> = {
  today: "Today",
  last_7_days: "Last 7 days",
  last_30_days: "Last 30 days",
  this_quarter: "This quarter",
  this_year: "This year",
  custom: "Custom range",
};

export const DASHBOARD_SCOPE_LABELS: Record<string, string> = {
  my: "My data",
  team: "Team",
};

export function getDefaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}
