import type {
  DashboardActivityItem,
  DashboardEntityRef,
  DashboardFunnel,
  DashboardLeadAnalytics,
  DashboardRevenue,
  DashboardScope,
  DashboardTeamMemberStats,
  DashboardUpcomingTask,
} from "@/types/dashboard";

export type AnalyticsRange =
  | "today"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "last_7_days"
  | "last_30_days"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "custom";

export interface AnalyticsFilters {
  range?: AnalyticsRange;
  scope?: DashboardScope;
  start_date?: string;
  end_date?: string;
  timezone?: string;
  owner_id?: string;
  company_id?: string;
  stage?: string;
}

export interface AnalyticsMeta {
  range: AnalyticsRange;
  scope: DashboardScope;
  start_date: string;
  end_date: string;
  timezone: string;
  generated_at: string;
  cached?: boolean;
}

export interface AnalyticsTrendPoint {
  label: string;
  value: string | number;
}

export interface AnalyticsKpiCard {
  key: string;
  label: string;
  value: string | number;
  formatted_value: string;
  growth_percent?: number | null;
  comparison_label?: string;
  trend?: AnalyticsTrendPoint[];
  currency?: string | null;
  href_path?: string | null;
}

export interface AnalyticsOverviewResponse {
  meta: AnalyticsMeta;
  kpis: AnalyticsKpiCard[];
  recent_activities: DashboardActivityItem[];
  upcoming_tasks: DashboardUpcomingTask[];
  recent_deals: DashboardEntityRef[];
  recent_companies: DashboardEntityRef[];
  latest_contacts: DashboardEntityRef[];
  upcoming_meetings: DashboardActivityItem[];
}

export interface AnalyticsRevenueResponse {
  meta: AnalyticsMeta;
  revenue: DashboardRevenue;
  monthly_revenue: string | number;
  annual_revenue: string | number;
  average_deal_value?: string | number | null;
  win_rate?: number | null;
  loss_rate?: number | null;
}

export interface AnalyticsPipelineResponse {
  meta: AnalyticsMeta;
  funnel: DashboardFunnel;
  pipeline_value: string | number;
  deals_by_stage: { stage: string; count: number; value: string | number }[];
}

export interface AnalyticsLeadsResponse {
  meta: AnalyticsMeta;
  leads: DashboardLeadAnalytics;
  new_leads: number;
  qualified_leads: number;
  lead_conversion_rate?: number | null;
}

export interface AnalyticsDealsResponse {
  meta: AnalyticsMeta;
  deals_won: number;
  deals_lost: number;
  won_revenue: string | number;
  lost_revenue: string | number;
  average_deal_size?: string | number | null;
  average_sales_cycle_days?: number | null;
  win_rate?: number | null;
}

export interface AnalyticsTasksResponse {
  meta: AnalyticsMeta;
  due_today: number;
  open_tasks: number;
  overdue_tasks: number;
  completed_tasks: number;
  completion_rate?: number | null;
  by_status: { status: string; count: number }[];
}

export interface AnalyticsActivityHeatmapDay {
  date: string;
  count: number;
}

export interface AnalyticsActivitiesResponse {
  meta: AnalyticsMeta;
  total_activities: number;
  open_activities: number;
  meetings_today: number;
  heatmap: AnalyticsActivityHeatmapDay[];
}

export interface AnalyticsTeamResponse {
  meta: AnalyticsMeta;
  members: DashboardTeamMemberStats[];
}

export interface AnalyticsForecastBucket {
  period_start: string;
  period_label: string;
  forecast_value: string | number;
  won_value: string | number;
}

export interface AnalyticsForecastResponse {
  meta: AnalyticsMeta;
  forecast_revenue: string | number;
  buckets: AnalyticsForecastBucket[];
}
