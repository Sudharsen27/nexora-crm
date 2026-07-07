import { apiFetch, API_BASE } from "@/lib/api/client";
import { getDefaultTimezone } from "@/lib/api/dashboard";
import { getAccessToken } from "@/lib/auth/tokens";
import type {
  BiDashboardCreatePayload,
  BiDashboardDetail,
  BiDashboardSummary,
  BiExecutiveSummary,
  BiFilters,
  BiForecastResponse,
  BiKpiResponse,
  BiMetricResponse,
  BiReportDetail,
  BiReportRunResult,
  BiReportSummary,
  BiScheduleResponse,
  BiTemplateSummary,
} from "@/types/bi";

function buildQuery(filters: BiFilters = {}): string {
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

export async function getBiExecutive(
  slug: string,
  filters: BiFilters = {},
): Promise<BiExecutiveSummary> {
  return apiFetch<BiExecutiveSummary>(`/tenants/${slug}/bi/executive${buildQuery(filters)}`);
}

export async function listBiDashboards(slug: string): Promise<BiDashboardSummary[]> {
  return apiFetch<BiDashboardSummary[]>(`/tenants/${slug}/bi/dashboards`);
}

export async function getBiDashboard(slug: string, id: string): Promise<BiDashboardDetail> {
  return apiFetch<BiDashboardDetail>(`/tenants/${slug}/bi/dashboards/${id}`);
}

export async function createBiDashboard(
  slug: string,
  payload: BiDashboardCreatePayload,
): Promise<BiDashboardDetail> {
  return apiFetch<BiDashboardDetail>(`/tenants/${slug}/bi/dashboards`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateBiDashboard(
  slug: string,
  id: string,
  payload: Partial<BiDashboardCreatePayload>,
): Promise<BiDashboardDetail> {
  return apiFetch<BiDashboardDetail>(`/tenants/${slug}/bi/dashboards/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteBiDashboard(slug: string, id: string): Promise<void> {
  return apiFetch<void>(`/tenants/${slug}/bi/dashboards/${id}`, { method: "DELETE" });
}

export async function duplicateBiDashboard(slug: string, id: string): Promise<BiDashboardDetail> {
  return apiFetch<BiDashboardDetail>(`/tenants/${slug}/bi/dashboards/${id}/duplicate`, {
    method: "POST",
  });
}

export async function listBiReports(slug: string): Promise<BiReportSummary[]> {
  return apiFetch<BiReportSummary[]>(`/tenants/${slug}/bi/reports`);
}

export async function getBiReport(slug: string, id: string): Promise<BiReportDetail> {
  return apiFetch<BiReportDetail>(`/tenants/${slug}/bi/reports/${id}`);
}

export async function createBiReport(
  slug: string,
  payload: {
    name: string;
    description?: string | null;
    chart_type?: string;
    config?: Record<string, unknown>;
    template_id?: string | null;
  },
): Promise<BiReportDetail> {
  return apiFetch<BiReportDetail>(`/tenants/${slug}/bi/reports`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateBiReport(
  slug: string,
  id: string,
  payload: Partial<{
    name: string;
    description: string | null;
    chart_type: string;
    config: Record<string, unknown>;
    is_favorite: boolean;
  }>,
): Promise<BiReportDetail> {
  return apiFetch<BiReportDetail>(`/tenants/${slug}/bi/reports/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteBiReport(slug: string, id: string): Promise<void> {
  return apiFetch<void>(`/tenants/${slug}/bi/reports/${id}`, { method: "DELETE" });
}

export async function runBiReport(slug: string, id: string): Promise<BiReportRunResult> {
  return apiFetch<BiReportRunResult>(`/tenants/${slug}/bi/reports/${id}/run`, { method: "POST" });
}

export async function exportBiReportCsv(slug: string, id: string): Promise<void> {
  const token = getAccessToken();
  const response = await fetch(
    `${API_BASE}/tenants/${slug}/bi/reports/${id}/export?format=csv`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: "include",
    },
  );
  if (!response.ok) throw new Error("Export failed");
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `report-${id}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function listBiTemplates(slug: string): Promise<BiTemplateSummary[]> {
  return apiFetch<BiTemplateSummary[]>(`/tenants/${slug}/bi/templates`);
}

export async function listBiSchedules(slug: string): Promise<BiScheduleResponse[]> {
  return apiFetch<BiScheduleResponse[]>(`/tenants/${slug}/bi/schedules`);
}

export async function createBiSchedule(
  slug: string,
  payload: {
    report_id: string;
    frequency?: string;
    export_format?: string;
    recipients?: string[];
    is_active?: boolean;
  },
): Promise<BiScheduleResponse> {
  return apiFetch<BiScheduleResponse>(`/tenants/${slug}/bi/schedules`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listBiKpis(slug: string): Promise<BiKpiResponse[]> {
  return apiFetch<BiKpiResponse[]>(`/tenants/${slug}/bi/kpis`);
}

export async function listBiMetrics(slug: string): Promise<BiMetricResponse[]> {
  return apiFetch<BiMetricResponse[]>(`/tenants/${slug}/bi/metrics`);
}

export async function generateBiForecast(
  slug: string,
  forecastType = "revenue",
): Promise<BiForecastResponse> {
  return apiFetch<BiForecastResponse>(
    `/tenants/${slug}/bi/forecast?forecast_type=${encodeURIComponent(forecastType)}`,
    { method: "POST" },
  );
}
