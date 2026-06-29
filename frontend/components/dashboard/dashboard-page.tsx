"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getDashboard, getDefaultTimezone } from "@/lib/api/dashboard";
import type { DashboardFilters, DashboardRange, DashboardResponse, DashboardScope } from "@/types/dashboard";
import { DashboardFilters as DashboardFiltersBar } from "@/components/dashboard/dashboard-filters";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { KpiRow } from "@/components/dashboard/kpi-row";
import { SalesFunnelChart } from "@/components/dashboard/sales-funnel-chart";
import { RevenueTrendChart } from "@/components/dashboard/revenue-trend-chart";
import { LeadAnalyticsCharts } from "@/components/dashboard/lead-analytics-charts";
import { TeamPerformanceTable } from "@/components/dashboard/team-performance-table";
import { RecentActivityFeed } from "@/components/dashboard/recent-activity-feed";
import { UpcomingTasksList } from "@/components/dashboard/upcoming-tasks-list";
import { CalendarStrip } from "@/components/dashboard/calendar-strip";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { RoleLabel } from "@/components/layout/role-badge";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DashboardPageProps {
  tenantSlug: string;
}

function widgetError(
  errors: DashboardResponse["errors"],
  widget: string,
): string | undefined {
  return errors.find((e) => e.widget === widget)?.message;
}

export function DashboardPage({ tenantSlug }: DashboardPageProps) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters: DashboardFilters = useMemo(
    () => ({
      range: (searchParams.get("range") as DashboardRange) || "last_30_days",
      scope: (searchParams.get("scope") as DashboardScope) || "my",
      timezone: getDefaultTimezone(),
    }),
    [searchParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDashboard(tenantSlug, filters);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = new Set(data?.meta.visible_widgets ?? []);
  const currency = data?.kpis?.currency ?? "USD";

  if (error && !data) {
    return (
      <WidgetError
        title="Dashboard unavailable"
        message={error}
        onRetry={() => void load()}
        className="mt-2"
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">Dashboard</h1>
            <p className="text-sm text-[var(--muted-foreground)]">
              Track pipeline, revenue, and team activity in one place. Signed in as{" "}
              <RoleLabel className="font-medium text-[var(--foreground)]" />.
            </p>
            {data ? (
              <p className="text-xs text-[var(--muted-foreground)]">
                {data.meta.start_date} — {data.meta.end_date} ·{" "}
                {data.meta.scope === "team" ? "Team view" : "My view"}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex items-center gap-2 self-start sm:self-end">
              <Link
                href={`/${tenantSlug}/tasks?due=overdue`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Review overdue
              </Link>
            </div>
            <QuickActions tenantSlug={tenantSlug} />
          </div>
        </div>
        <div className="mt-4 border-t border-[var(--border)] pt-4">
          <DashboardFiltersBar tenantSlug={tenantSlug} />
        </div>
      </header>

      {loading && !data ? (
        <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <WidgetSkeleton key={i} variant="kpi" />
            ))}
          </div>
          <div className="grid gap-4 xl:grid-cols-12">
            <div className="xl:col-span-5">
              <Card>
                <CardContent className="pt-6">
                  <WidgetSkeleton variant="chart" />
                </CardContent>
              </Card>
            </div>
            <div className="xl:col-span-7">
              <Card>
                <CardContent className="pt-6">
                  <WidgetSkeleton variant="chart" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : null}

      {data ? (
        <div className={cn("space-y-6", loading && "pointer-events-none opacity-60")}>
          {data.errors.length > 0 ? (
            <div
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
              role="status"
            >
              Some widgets could not be loaded. Partial data is shown below.
            </div>
          ) : null}

          {visible.has("kpis") && data.kpis ? (
            widgetError(data.errors, "kpis") ? (
              <WidgetError title="KPIs" message={widgetError(data.errors, "kpis")!} onRetry={() => void load()} />
            ) : (
              <KpiRow tenantSlug={tenantSlug} kpis={data.kpis} />
            )
          ) : null}

          {(visible.has("funnel") || visible.has("revenue")) && (
            <div className="grid gap-4 xl:grid-cols-12">
              {visible.has("funnel") ? (
                <div className="xl:col-span-5">
                  {widgetError(data.errors, "funnel") ? (
                    <WidgetError
                      title="Sales funnel"
                      message={widgetError(data.errors, "funnel")!}
                      onRetry={() => void load()}
                    />
                  ) : data.funnel ? (
                    <SalesFunnelChart tenantSlug={tenantSlug} funnel={data.funnel} currency={currency} />
                  ) : null}
                </div>
              ) : null}
              {visible.has("revenue") ? (
                <div className={visible.has("funnel") ? "xl:col-span-7" : "xl:col-span-12"}>
                  {widgetError(data.errors, "revenue") ? (
                    <WidgetError
                      title="Revenue trend"
                      message={widgetError(data.errors, "revenue")!}
                      onRetry={() => void load()}
                    />
                  ) : data.revenue ? (
                    <RevenueTrendChart tenantSlug={tenantSlug} revenue={data.revenue} currency={currency} />
                  ) : null}
                </div>
              ) : null}
            </div>
          )}

          {visible.has("leads") ? (
            widgetError(data.errors, "leads") ? (
              <WidgetError title="Lead analytics" message={widgetError(data.errors, "leads")!} onRetry={() => void load()} />
            ) : data.leads ? (
              <LeadAnalyticsCharts tenantSlug={tenantSlug} leads={data.leads} />
            ) : null
          ) : null}

          {visible.has("team_performance") ? (
            widgetError(data.errors, "team_performance") ? (
              <WidgetError
                title="Team performance"
                message={widgetError(data.errors, "team_performance")!}
                onRetry={() => void load()}
              />
            ) : data.team_performance ? (
              <TeamPerformanceTable
                tenantSlug={tenantSlug}
                members={data.team_performance}
                currency={currency}
              />
            ) : null
          ) : null}

          {(visible.has("upcoming_tasks") || visible.has("calendar")) && (
            <div className="grid gap-4 xl:grid-cols-12">
              {visible.has("upcoming_tasks") ? (
                <div className="xl:col-span-5">
                  {widgetError(data.errors, "upcoming_tasks") ? (
                    <WidgetError
                      title="Upcoming tasks"
                      message={widgetError(data.errors, "upcoming_tasks")!}
                      onRetry={() => void load()}
                    />
                  ) : data.upcoming_tasks ? (
                    <UpcomingTasksList tenantSlug={tenantSlug} tasks={data.upcoming_tasks} />
                  ) : null}
                </div>
              ) : null}
              {visible.has("calendar") ? (
                <div className={visible.has("upcoming_tasks") ? "xl:col-span-7" : "xl:col-span-12"}>
                  {widgetError(data.errors, "calendar") ? (
                    <WidgetError
                      title="Calendar"
                      message={widgetError(data.errors, "calendar")!}
                      onRetry={() => void load()}
                    />
                  ) : data.calendar ? (
                    <CalendarStrip tenantSlug={tenantSlug} days={data.calendar} />
                  ) : null}
                </div>
              ) : null}
            </div>
          )}

          {visible.has("recent_activities") ? (
            widgetError(data.errors, "recent_activities") ? (
              <WidgetError
                title="Recent activity"
                message={widgetError(data.errors, "recent_activities")!}
                onRetry={() => void load()}
              />
            ) : data.recent_activities ? (
              <RecentActivityFeed tenantSlug={tenantSlug} activities={data.recent_activities} />
            ) : null
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
