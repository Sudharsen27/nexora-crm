import type { TaskDashboardSummary } from "@/types/api";

export type DashboardRange =
  | "today"
  | "last_7_days"
  | "last_30_days"
  | "this_quarter"
  | "this_year"
  | "custom"
  | "yesterday"
  | "this_week"
  | "last_week"
  | "this_month"
  | "last_month";

export type DashboardScope = "my" | "team";

export interface DashboardFilters {
  range: DashboardRange;
  scope: DashboardScope;
  start_date?: string;
  end_date?: string;
  timezone?: string;
}

export interface DashboardWidgetError {
  widget: string;
  message: string;
}

export interface DashboardMeta {
  range: DashboardRange;
  scope: DashboardScope;
  start_date: string;
  end_date: string;
  timezone: string;
  visible_widgets: string[];
  generated_at: string;
}

export interface DashboardKpis {
  my_open_tasks?: number | null;
  my_overdue_tasks?: number | null;
  my_due_today_tasks?: number | null;
  open_pipeline_value?: string | number | null;
  open_pipeline_count?: number | null;
  won_revenue?: string | number | null;
  won_deals_count?: number | null;
  new_leads_count?: number | null;
  activities_count?: number | null;
  currency?: string;
}

export interface DashboardFunnelStage {
  slug: string;
  label: string;
  count: number;
  value: string | number;
  percent_of_total: number;
}

export interface DashboardFunnel {
  stages: DashboardFunnelStage[];
  lost_count: number;
  lost_value: string | number;
  total_open_count: number;
  total_open_value: string | number;
}

export interface DashboardRevenueBucket {
  period_start: string;
  period_label: string;
  value: string | number;
  deal_count: number;
}

export interface DashboardRevenue {
  buckets: DashboardRevenueBucket[];
  total_value: string | number;
  total_deals: number;
  average_deal_size?: string | number | null;
  win_rate?: number | null;
}

export interface DashboardLeadBucket {
  key: string;
  label: string;
  count: number;
  percent: number;
}

export interface DashboardLeadAnalytics {
  by_source: DashboardLeadBucket[];
  by_status: DashboardLeadBucket[];
  conversion_rate?: number | null;
}

export interface DashboardTeamMemberStats {
  user_id: string;
  full_name: string;
  open_deals: number;
  pipeline_value: string | number;
  open_tasks: number;
  overdue_tasks: number;
  activities_count: number;
  won_deals_count: number;
  won_revenue: string | number;
}

export interface DashboardEntityRef {
  entity_type: string;
  entity_id: string;
  display_name: string;
  href_path?: string | null;
}

export interface DashboardPersonRef {
  id: string;
  full_name: string;
}

export interface DashboardActivityItem {
  id: string;
  activity_type: string;
  action?: string | null;
  title?: string | null;
  description: string;
  icon?: string | null;
  color?: string | null;
  created_at: string;
  scheduled_at?: string | null;
  created_by?: DashboardPersonRef | null;
  entity?: DashboardEntityRef | null;
}

export interface DashboardUpcomingTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date?: string | null;
  is_overdue: boolean;
  assigned_to?: DashboardPersonRef | null;
  entity?: DashboardEntityRef | null;
}

export interface DashboardCalendarItem {
  kind: "task" | "meeting" | "call";
  id: string;
  title: string;
  time?: string | null;
}

export interface DashboardCalendarDay {
  date: string;
  task_count: number;
  meeting_count: number;
  call_count: number;
  items: DashboardCalendarItem[];
}

export interface DashboardResponse {
  meta: DashboardMeta;
  kpis?: DashboardKpis | null;
  funnel?: DashboardFunnel | null;
  revenue?: DashboardRevenue | null;
  leads?: DashboardLeadAnalytics | null;
  team_performance?: DashboardTeamMemberStats[] | null;
  recent_activities?: DashboardActivityItem[] | null;
  upcoming_tasks?: DashboardUpcomingTask[] | null;
  calendar?: DashboardCalendarDay[] | null;
  tasks_summary?: TaskDashboardSummary | null;
  errors: DashboardWidgetError[];
}
