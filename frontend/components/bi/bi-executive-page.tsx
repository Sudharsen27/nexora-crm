"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Briefcase,
  DollarSign,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { AiMarkdown } from "@/components/ai/ai-markdown";
import { DashboardFilters as DashboardFiltersBar } from "@/components/dashboard/dashboard-filters";
import { RevenueTrendChart } from "@/components/dashboard/revenue-trend-chart";
import { SalesFunnelChart } from "@/components/dashboard/sales-funnel-chart";
import { TeamPerformanceTable } from "@/components/dashboard/team-performance-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { BiNavTabs } from "@/components/bi/bi-nav-tabs";
import { BiWidgetChart } from "@/components/bi/bi-chart-renderer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDefaultTimezone } from "@/lib/api/dashboard";
import { useBiExecutive, useBiKpis } from "@/hooks/use-bi";
import type { AnalyticsFilters, AnalyticsRange } from "@/types/analytics";
import type { DashboardFunnel, DashboardRevenue, DashboardScope } from "@/types/dashboard";
import type { DashboardTeamMemberStats } from "@/types/dashboard";

const KPI_ICONS: Record<string, typeof DollarSign> = {
  total_revenue: DollarSign,
  pipeline_value: TrendingUp,
  open_deals: Briefcase,
  conversion_rate: Target,
  won_deals: Target,
  total_leads: Users,
};

interface BiExecutivePageProps {
  tenantSlug: string;
}

export function BiExecutivePage({ tenantSlug }: BiExecutivePageProps) {
  const searchParams = useSearchParams();
  const filters: AnalyticsFilters = useMemo(
    () => ({
      range: (searchParams.get("range") as AnalyticsRange) || "last_30_days",
      scope: (searchParams.get("scope") as DashboardScope) || "team",
      start_date: searchParams.get("start_date") ?? undefined,
      end_date: searchParams.get("end_date") ?? undefined,
      timezone: getDefaultTimezone(),
    }),
    [searchParams],
  );

  const { data, loading, error } = useBiExecutive(tenantSlug, filters);
  const { data: kpis } = useBiKpis(tenantSlug);

  if (loading) {
    return (
      <div className="space-y-6">
        <BiNavTabs tenantSlug={tenantSlug} />
        <WidgetSkeleton variant="chart" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <BiNavTabs tenantSlug={tenantSlug} />
        <WidgetError title="Failed to load" message={error ?? "Failed to load BI dashboard"} />
      </div>
    );
  }

  const revenue: DashboardRevenue = {
    buckets: data.revenue_trend.map((b) => ({
      period_start: String(b.period_start ?? ""),
      period_label: String(b.period_label ?? b.label ?? ""),
      value: Number(b.value ?? 0),
      deal_count: Number(b.deal_count ?? b.deals ?? 0),
    })),
    total_value: data.revenue_trend.reduce((sum, b) => sum + Number(b.value ?? 0), 0),
    total_deals: data.revenue_trend.reduce((sum, b) => sum + Number(b.deal_count ?? 0), 0),
    average_deal_size: null,
    win_rate: null,
  };

  const funnel: DashboardFunnel = {
    stages: data.pipeline.map((s) => ({
      slug: String(s.slug ?? ""),
      label: String(s.label ?? ""),
      count: Number(s.count ?? 0),
      value: Number(s.value ?? 0),
      percent_of_total: Number(s.percent_of_total ?? 0),
    })),
    lost_count: 0,
    lost_value: 0,
    total_open_count: data.pipeline.reduce((sum, s) => sum + Number(s.count ?? 0), 0),
    total_open_value: data.pipeline.reduce((sum, s) => sum + Number(s.value ?? 0), 0),
  };

  const teamMembers = data.team_performance as unknown as DashboardTeamMemberStats[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-600 dark:text-violet-400">
            Business Intelligence
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)] sm:text-3xl">
            Executive Dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Revenue, pipeline, forecasts, and team performance at a glance.
          </p>
        </div>
        <BiNavTabs tenantSlug={tenantSlug} />
      </div>

      <DashboardFiltersBar tenantSlug={tenantSlug} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.slice(0, 4).map((kpi) => {
          const Icon = KPI_ICONS[kpi.key] ?? DollarSign;
          return (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={kpi.value}
              icon={Icon}
              growthPercent={kpi.change}
              trend={kpi.trend}
            />
          );
        })}
      </div>

      {kpis.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {kpis.map((goal) => (
            <Card
              key={goal.id}
              className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md"
            >
              <CardHeader className="pb-2">
                <CardDescription>{goal.label}</CardDescription>
                <CardTitle className="text-lg">
                  {goal.current_value ?? "—"} / {goal.target_value ?? "—"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all"
                    style={{ width: `${Math.min(goal.progress_pct ?? 0, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                  {goal.progress_pct != null ? `${goal.progress_pct.toFixed(0)}% of target` : "No target set"}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <RevenueTrendChart tenantSlug={tenantSlug} revenue={revenue} />
        </div>
        <div className="xl:col-span-5">
          <SalesFunnelChart tenantSlug={tenantSlug} funnel={funnel} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <TeamPerformanceTable tenantSlug={tenantSlug} members={teamMembers} />
        </div>
        <div className="xl:col-span-5 space-y-4">
          <Card className="border-[var(--border)]/70 bg-gradient-to-br from-violet-500/10 via-[var(--surface)]/80 to-indigo-500/10 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-violet-500" />
                AI Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AiMarkdown content={data.ai_summary} className="text-sm leading-relaxed" />
            </CardContent>
          </Card>

          <Card className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-base">Top Deals</CardTitle>
              <CardDescription>Highest-value open opportunities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.top_deals.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">No open deals</p>
              ) : (
                data.top_deals.map((deal) => (
                  <Link
                    key={String(deal.id)}
                    href={`/${tenantSlug}/deals/${deal.id}`}
                    className="flex items-center justify-between rounded-lg border border-[var(--border)]/50 px-3 py-2 text-sm transition-colors hover:bg-[var(--surface-muted)]"
                  >
                    <span className="font-medium">{String(deal.title)}</span>
                    <span className="text-[var(--muted-foreground)]">
                      {deal.value != null ? `$${Number(deal.value).toLocaleString()}` : "—"}
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {data.widgets.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {data.widgets
            .filter((w) => !["kpi", "ai_summary"].includes(w.widget_type))
            .map((widget) => (
              <BiWidgetChart
                key={widget.id}
                widgetType={widget.widget_type}
                title={widget.title}
                data={widget.data}
              />
            ))}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Reports</CardTitle>
            <Link href={`/${tenantSlug}/bi/reports`} className="text-xs text-violet-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recent_reports.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No reports yet</p>
            ) : (
              data.recent_reports.map((r) => (
                <Link
                  key={r.id}
                  href={`/${tenantSlug}/bi/reports/${r.id}`}
                  className="block rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--surface-muted)]"
                >
                  {r.name}
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base">Scheduled Reports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.scheduled_reports.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No schedules configured</p>
            ) : (
              data.scheduled_reports.map((s) => (
                <div key={s.id} className="flex justify-between text-sm">
                  <span>{s.frequency}</span>
                  <span className="text-[var(--muted-foreground)]">{s.export_format.toUpperCase()}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
