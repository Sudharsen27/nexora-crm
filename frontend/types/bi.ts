import type { AnalyticsFilters } from "@/types/analytics";

export type BiChartType =
  | "line"
  | "area"
  | "bar"
  | "horizontal_bar"
  | "pie"
  | "donut"
  | "funnel"
  | "gauge"
  | "kpi"
  | "table"
  | "ai_summary";

export interface BiWidget {
  id: string;
  dashboard_id: string;
  title: string;
  widget_type: string;
  metric_key: string | null;
  config: Record<string, unknown>;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  sort_order: number;
  data?: Record<string, unknown> | null;
}

export interface BiDashboardSummary {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  is_executive: boolean;
  widget_count: number;
  updated_at: string;
}

export interface BiDashboardDetail extends BiDashboardSummary {
  layout: Record<string, unknown>;
  filters: Record<string, unknown>;
  widgets: BiWidget[];
}

export interface BiDashboardCreatePayload {
  name: string;
  description?: string | null;
  visibility?: string;
  is_executive?: boolean;
  layout?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  widgets?: Omit<BiWidget, "id" | "dashboard_id" | "data">[];
}

export interface BiReportConfig {
  metric_key: string;
  dimensions?: string[];
  filters?: Record<string, unknown>;
  group_by?: string | null;
  sort_by?: string | null;
  date_range?: string;
  drill_down_entity?: string | null;
}

export interface BiReportSummary {
  id: string;
  name: string;
  description: string | null;
  chart_type: string;
  is_favorite: boolean;
  updated_at: string;
}

export interface BiReportDetail extends BiReportSummary {
  config: BiReportConfig;
  template_id: string | null;
}

export interface BiReportRunResult {
  report_id: string;
  chart_type: string;
  columns: string[];
  rows: Record<string, unknown>[];
  series: Record<string, unknown>[];
  totals: Record<string, unknown>;
  drill_down: Record<string, unknown>[];
}

export interface BiTemplateSummary {
  id: string;
  name: string;
  category: string;
  description: string | null;
  is_system: boolean;
  config: Record<string, unknown>;
}

export interface BiScheduleResponse {
  id: string;
  report_id: string;
  frequency: string;
  export_format: string;
  recipients: string[];
  is_active: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
}

export interface BiKpiResponse {
  id: string;
  key: string;
  label: string;
  metric_key: string;
  target_value: number | null;
  current_value: number | string | null;
  unit: string;
  progress_pct: number | null;
  description: string | null;
  is_active: boolean;
}

export interface BiMetricResponse {
  id: string;
  key: string;
  label: string;
  source_entity: string;
  aggregation: string;
  field: string | null;
  filters: Record<string, unknown>;
  is_system: boolean;
}

export interface BiForecastResponse {
  id: string | null;
  forecast_type: string;
  period_label: string;
  predicted_value: number | null;
  confidence: number | null;
  data: Record<string, unknown>;
  ai_summary: string | null;
  buckets: Record<string, unknown>[];
}

export interface BiExecutiveKpi {
  key: string;
  label: string;
  value: string | number;
  change?: number | null;
  trend?: { label: string; value: number }[];
}

export interface BiExecutiveSummary {
  kpis: BiExecutiveKpi[];
  widgets: BiWidget[];
  revenue_trend: Record<string, unknown>[];
  pipeline: Record<string, unknown>[];
  top_deals: Record<string, unknown>[];
  team_performance: Record<string, unknown>[];
  ai_summary: string;
  recent_reports: BiReportSummary[];
  scheduled_reports: BiScheduleResponse[];
  generated_at: string;
}

export type BiFilters = AnalyticsFilters;
