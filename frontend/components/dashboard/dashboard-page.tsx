"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getDefaultTimezone } from "@/lib/api/dashboard";
import { useAnalyticsCharts, useAnalyticsOverview } from "@/hooks/use-analytics";
import { useDashboard } from "@/hooks/use-dashboard";
import type { AnalyticsFilters, AnalyticsRange } from "@/types/analytics";
import type { DashboardFilters, DashboardRange, DashboardScope } from "@/types/dashboard";
import { DashboardFilters as DashboardFiltersBar } from "@/components/dashboard/dashboard-filters";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { AnalyticsKpiRow } from "@/components/dashboard/analytics-kpi-row";
import { SalesFunnelChart } from "@/components/dashboard/sales-funnel-chart";
import { RevenueTrendChart } from "@/components/dashboard/revenue-trend-chart";
import { LeadAnalyticsCharts } from "@/components/dashboard/lead-analytics-charts";
import { TeamPerformanceTable } from "@/components/dashboard/team-performance-table";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { LatestNotificationsWidget } from "@/components/dashboard/latest-notifications-widget";
import { UpcomingTasksList } from "@/components/dashboard/upcoming-tasks-list";
import { CalendarStrip } from "@/components/dashboard/calendar-strip";
import { DealsByStageChart } from "@/components/dashboard/deals-by-stage-chart";
import { TaskCompletionChart } from "@/components/dashboard/task-completion-chart";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";
import { SalesForecastChart } from "@/components/dashboard/sales-forecast-chart";
import { EntityListPanel } from "@/components/dashboard/entity-list-panel";
import { TaskSummaryWidget } from "@/components/dashboard/task-summary-widget";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { RoleLabel } from "@/components/layout/role-badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

interface DashboardPageProps {
  tenantSlug: string;
}

const DASHBOARD_RANGE_MAP: Record<string, DashboardRange> = {
  today: "today",
  last_7_days: "last_7_days",
  last_30_days: "last_30_days",
  this_quarter: "this_quarter",
  this_year: "this_year",
  custom: "custom",
  yesterday: "last_7_days",
  this_week: "last_7_days",
  last_week: "last_7_days",
  this_month: "last_30_days",
  last_month: "last_30_days",
};

export function DashboardPage({ tenantSlug }: DashboardPageProps) {
  const searchParams = useSearchParams();

  const analyticsFilters: AnalyticsFilters = useMemo(
    () => ({
      range: (searchParams.get("range") as AnalyticsRange) || "last_30_days",
      scope: (searchParams.get("scope") as DashboardScope) || "my",
      start_date: searchParams.get("start_date") ?? undefined,
      end_date: searchParams.get("end_date") ?? undefined,
      timezone: getDefaultTimezone(),
      owner_id: searchParams.get("owner_id") ?? undefined,
    }),
    [searchParams],
  );

  const dashboardFilters: DashboardFilters = useMemo(() => {
    const range = searchParams.get("range") ?? "last_30_days";
    return {
      range: DASHBOARD_RANGE_MAP[range] ?? "last_30_days",
      scope: (searchParams.get("scope") as DashboardScope) || "my",
      start_date: searchParams.get("start_date") ?? undefined,
      end_date: searchParams.get("end_date") ?? undefined,
      timezone: getDefaultTimezone(),
    };
  }, [searchParams]);

  const { data: overview, loading: overviewLoading, error: overviewError, refresh: refreshOverview } =
    useAnalyticsOverview(tenantSlug, analyticsFilters);
  const { revenue, pipeline, tasks, activities, forecast, loading: chartsLoading, refresh: refreshCharts } =
    useAnalyticsCharts(tenantSlug, analyticsFilters);
  const { data, loading: dashLoading, error: dashError, refresh: refreshDash } = useDashboard(
    tenantSlug,
    dashboardFilters,
  );

  const loading = overviewLoading && !overview;
  const refreshing = overviewLoading || dashLoading || chartsLoading;
  const currency = data?.kpis?.currency ?? "USD";
  const visible = new Set(data?.meta.visible_widgets ?? []);

  function refreshAll() {
    void refreshOverview();
    void refreshCharts();
    void refreshDash();
  }

  if (overviewError && !overview && dashError && !data) {
    return (
      <WidgetError
        title="Dashboard unavailable"
        message={overviewError || dashError || "Failed to load"}
        onRetry={refreshAll}
        className="mt-2"
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/90 p-5 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Executive Dashboard</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Revenue, pipeline, and team performance at a glance. Signed in as{" "}
              <RoleLabel className="font-medium text-[var(--foreground)]" />.
            </p>
            {overview ? (
              <p className="text-xs text-[var(--muted-foreground)]">
                {overview.meta.start_date} — {overview.meta.end_date} ·{" "}
                {overview.meta.scope === "team" ? "Team view" : "My view"}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <Link
              href={`/${tenantSlug}/tasks?due=overdue`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "self-start sm:self-end")}
            >
              Review overdue
            </Link>
            <QuickActions tenantSlug={tenantSlug} />
          </div>
        </div>
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <DashboardFiltersBar tenantSlug={tenantSlug} />
        </div>
      </header>

      {loading ? (
        <div className="space-y-6" aria-busy="true">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <WidgetSkeleton key={i} variant="kpi" />
            ))}
          </div>
          <WidgetSkeleton variant="chart" />
        </div>
      ) : null}

      <div className={cn("space-y-6", refreshing && overview && "pointer-events-none opacity-70")}>
        <AnalyticsKpiRow
          tenantSlug={tenantSlug}
          kpis={overview?.kpis ?? []}
          loading={overviewLoading && !overview}
        />

        {(visible.has("funnel") || revenue) && (
          <div className="grid gap-4 xl:grid-cols-12">
            {visible.has("funnel") && data?.funnel ? (
              <div className="xl:col-span-5">
                <SalesFunnelChart tenantSlug={tenantSlug} funnel={data.funnel} currency={currency} />
              </div>
            ) : null}
            {revenue ? (
              <div className={data?.funnel ? "xl:col-span-7" : "xl:col-span-12"}>
                <RevenueTrendChart tenantSlug={tenantSlug} revenue={revenue.revenue} currency={currency} />
              </div>
            ) : null}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-12">
          {pipeline ? (
            <div className="xl:col-span-6">
              <DealsByStageChart
                tenantSlug={tenantSlug}
                stages={pipeline.deals_by_stage}
                currency={currency}
              />
            </div>
          ) : null}
          {forecast ? (
            <div className="xl:col-span-6">
              <SalesForecastChart
                tenantSlug={tenantSlug}
                buckets={forecast.buckets}
                forecastRevenue={forecast.forecast_revenue}
                currency={currency}
              />
            </div>
          ) : null}
        </div>

        {visible.has("leads") && data?.leads ? (
          <LeadAnalyticsCharts tenantSlug={tenantSlug} leads={data.leads} />
        ) : null}

        <div className="grid gap-4 xl:grid-cols-12">
          {tasks ? (
            <div className="xl:col-span-5">
              <TaskCompletionChart
                completed={tasks.completed_tasks}
                open={tasks.open_tasks}
                overdue={tasks.overdue_tasks}
                completionRate={tasks.completion_rate}
              />
            </div>
          ) : null}
          {activities ? (
            <div className="xl:col-span-7">
              <ActivityHeatmap days={activities.heatmap} />
            </div>
          ) : null}
        </div>

        {visible.has("team_performance") && data?.team_performance ? (
          <TeamPerformanceTable
            tenantSlug={tenantSlug}
            members={data.team_performance}
            currency={currency}
          />
        ) : null}

        {visible.has("tasks_summary") && data?.tasks_summary ? (
          <TaskSummaryWidget tenantSlug={tenantSlug} summary={data.tasks_summary} />
        ) : null}

        <div className="grid gap-4 xl:grid-cols-12">
          {(visible.has("upcoming_tasks") || overview?.upcoming_tasks.length) ? (
            <div className="xl:col-span-5">
              <UpcomingTasksList
                tenantSlug={tenantSlug}
                tasks={overview?.upcoming_tasks ?? data?.upcoming_tasks ?? []}
              />
            </div>
          ) : null}
          {visible.has("calendar") && data?.calendar ? (
            <div className="xl:col-span-7">
              <CalendarStrip tenantSlug={tenantSlug} days={data.calendar} />
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <EntityListPanel
            title="Recent deals"
            description="Latest deals in your pipeline"
            items={overview?.recent_deals ?? []}
            tenantSlug={tenantSlug}
            emptyTitle="No deals"
            emptyDescription="Create your first deal to track revenue."
            emptyActionLabel="Create deal"
            emptyActionHref={`/${tenantSlug}/deals`}
          />
          <EntityListPanel
            title="Recent companies"
            description="Newly added organizations"
            items={overview?.recent_companies ?? []}
            tenantSlug={tenantSlug}
            emptyTitle="No companies"
            emptyDescription="Add companies to organize accounts."
            emptyActionLabel="Add company"
            emptyActionHref={`/${tenantSlug}/companies`}
          />
          <EntityListPanel
            title="Latest contacts"
            description="Recently created contacts"
            items={overview?.latest_contacts ?? []}
            tenantSlug={tenantSlug}
            emptyTitle="No contacts"
            emptyDescription="Build your contact database."
            emptyActionLabel="Add contact"
            emptyActionHref={`/${tenantSlug}/contacts`}
          />
        </div>

        {(overview?.recent_activities.length || visible.has("recent_activities")) ? (
          <RecentActivityFeed
            tenantSlug={tenantSlug}
            activities={overview?.recent_activities ?? data?.recent_activities ?? []}
          />
        ) : null}

        <LatestNotificationsWidget tenantSlug={tenantSlug} />
      </div>
    </div>
  );
}
