import { apiFetch } from "@/lib/api/client";
import { getDefaultTimezone } from "@/lib/api/dashboard";
import type {
  AnalyticsActivitiesResponse,
  AnalyticsDealsResponse,
  AnalyticsFilters,
  AnalyticsForecastResponse,
  AnalyticsLeadsResponse,
  AnalyticsOverviewResponse,
  AnalyticsPipelineResponse,
  AnalyticsRevenueResponse,
  AnalyticsTasksResponse,
  AnalyticsTeamResponse,
} from "@/types/analytics";

function buildQuery(filters: AnalyticsFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.range) params.set("range", filters.range);
  if (filters.scope) params.set("scope", filters.scope);
  if (filters.start_date) params.set("start_date", filters.start_date);
  if (filters.end_date) params.set("end_date", filters.end_date);
  params.set("timezone", filters.timezone ?? getDefaultTimezone());
  if (filters.owner_id) params.set("owner_id", filters.owner_id);
  if (filters.company_id) params.set("company_id", filters.company_id);
  if (filters.stage) params.set("stage", filters.stage);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const ANALYTICS_RANGE_LABELS: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  this_week: "This week",
  last_week: "Last week",
  last_7_days: "Last 7 days",
  last_30_days: "Last 30 days",
  this_month: "This month",
  last_month: "Last month",
  this_quarter: "This quarter",
  this_year: "This year",
  custom: "Custom range",
};

export async function getAnalyticsOverview(
  slug: string,
  filters: AnalyticsFilters = {},
): Promise<AnalyticsOverviewResponse> {
  return apiFetch<AnalyticsOverviewResponse>(`/tenants/${slug}/analytics/overview${buildQuery(filters)}`);
}

export async function getAnalyticsRevenue(
  slug: string,
  filters: AnalyticsFilters = {},
): Promise<AnalyticsRevenueResponse> {
  return apiFetch<AnalyticsRevenueResponse>(`/tenants/${slug}/analytics/revenue${buildQuery(filters)}`);
}

export async function getAnalyticsPipeline(
  slug: string,
  filters: AnalyticsFilters = {},
): Promise<AnalyticsPipelineResponse> {
  return apiFetch<AnalyticsPipelineResponse>(`/tenants/${slug}/analytics/pipeline${buildQuery(filters)}`);
}

export async function getAnalyticsLeads(
  slug: string,
  filters: AnalyticsFilters = {},
): Promise<AnalyticsLeadsResponse> {
  return apiFetch<AnalyticsLeadsResponse>(`/tenants/${slug}/analytics/leads${buildQuery(filters)}`);
}

export async function getAnalyticsDeals(
  slug: string,
  filters: AnalyticsFilters = {},
): Promise<AnalyticsDealsResponse> {
  return apiFetch<AnalyticsDealsResponse>(`/tenants/${slug}/analytics/deals${buildQuery(filters)}`);
}

export async function getAnalyticsTasks(
  slug: string,
  filters: AnalyticsFilters = {},
): Promise<AnalyticsTasksResponse> {
  return apiFetch<AnalyticsTasksResponse>(`/tenants/${slug}/analytics/tasks${buildQuery(filters)}`);
}

export async function getAnalyticsActivities(
  slug: string,
  filters: AnalyticsFilters = {},
): Promise<AnalyticsActivitiesResponse> {
  return apiFetch<AnalyticsActivitiesResponse>(`/tenants/${slug}/analytics/activities${buildQuery(filters)}`);
}

export async function getAnalyticsTeam(
  slug: string,
  filters: AnalyticsFilters = {},
): Promise<AnalyticsTeamResponse> {
  return apiFetch<AnalyticsTeamResponse>(`/tenants/${slug}/analytics/team${buildQuery(filters)}`);
}

export async function getAnalyticsForecast(
  slug: string,
  filters: AnalyticsFilters = {},
): Promise<AnalyticsForecastResponse> {
  return apiFetch<AnalyticsForecastResponse>(`/tenants/${slug}/analytics/forecast${buildQuery(filters)}`);
}
