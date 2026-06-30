"use client";

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Briefcase,
  DollarSign,
  Percent,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/api/deals";
import type { DealStatistics } from "@/types/api";

const STAGE_CHART_COLORS = [
  "#3b82f6",
  "#06b6d4",
  "#f59e0b",
  "#f97316",
  "#22c55e",
  "#ef4444",
];

interface PipelineWidgetsProps {
  stats: DealStatistics | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}

function KpiSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {Array.from({ length: 7 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-2 h-8 w-24" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export function PipelineWidgets({ stats, loading, error, onRetry }: PipelineWidgetsProps) {
  if (loading) return <KpiSkeleton />;

  if (error || !stats) {
    return (
      <Card className="border-red-200 dark:border-red-900/50">
        <CardContent className="flex items-center justify-between py-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error ?? "Failed to load stats"}</p>
          {onRetry && (
            <button type="button" className="text-sm text-[var(--primary)]" onClick={onRetry}>
              Retry
            </button>
          )}
        </CardContent>
      </Card>
    );
  }

  const kpis = [
    {
      label: "Pipeline value",
      value: formatCurrency(stats.pipeline_value, "USD"),
      icon: Briefcase,
      tone: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Won revenue",
      value: formatCurrency(stats.won_revenue, "USD"),
      icon: Trophy,
      tone: "text-green-600 dark:text-green-400",
    },
    {
      label: "Lost revenue",
      value: formatCurrency(stats.lost_revenue, "USD"),
      icon: TrendingDown,
      tone: "text-red-600 dark:text-red-400",
    },
    {
      label: "Forecast",
      value: formatCurrency(stats.forecast_revenue, "USD"),
      icon: Target,
      tone: "text-violet-600 dark:text-violet-400",
    },
    {
      label: "Deals this month",
      value: stats.deals_this_month,
      icon: DollarSign,
      tone: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Conversion",
      value: `${stats.conversion_rate}%`,
      icon: Percent,
      tone: "text-cyan-600 dark:text-cyan-400",
    },
    {
      label: "Avg deal size",
      value: formatCurrency(stats.average_deal_size, "USD"),
      icon: TrendingUp,
      tone: "text-orange-600 dark:text-orange-400",
    },
  ];

  const funnelData = stats.stage_breakdown.map((s) => ({
    name: s.label,
    count: s.count,
    value: s.value,
  }));

  const pieData = stats.stage_breakdown
    .filter((s) => s.value > 0)
    .map((s) => ({ name: s.label, value: s.value }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-[var(--muted-foreground)]">{kpi.label}</p>
                <kpi.icon className={`h-4 w-4 ${kpi.tone}`} />
              </div>
              <CardTitle className="text-xl tabular-nums">{kpi.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deals by stage</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {funnelData.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {funnelData.map((_, i) => (
                      <Cell key={i} fill={STAGE_CHART_COLORS[i % STAGE_CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-[var(--muted-foreground)]">
                No deals yet
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by stage</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={STAGE_CHART_COLORS[i % STAGE_CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) =>
                      new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(Number(value ?? 0))
                    }
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-[var(--muted-foreground)]">
                No revenue data
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
