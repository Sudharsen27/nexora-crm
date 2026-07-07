"use client";

import { useEffect } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Sparkles, TrendingUp } from "lucide-react";
import { AiMarkdown } from "@/components/ai/ai-markdown";
import { BiNavTabs } from "@/components/bi/bi-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useBiForecast } from "@/hooks/use-bi";
import { toNumber } from "@/lib/dashboard-format";

interface BiForecastPageProps {
  tenantSlug: string;
}

export function BiForecastPage({ tenantSlug }: BiForecastPageProps) {
  const { data, loading, error, generate } = useBiForecast(tenantSlug);

  useEffect(() => {
    void generate("revenue");
  }, [generate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Revenue Forecast</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            AI-assisted pipeline and revenue projections.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <BiNavTabs tenantSlug={tenantSlug} />
          <Button onClick={() => void generate("revenue")} disabled={loading}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Refresh Forecast
          </Button>
        </div>
      </div>

      {loading && !data ? <WidgetSkeleton variant="chart" /> : null}
      {error ? <WidgetError title="Forecast failed" message={error} /> : null}

      {data ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-[var(--border)]/70 bg-gradient-to-br from-violet-500/10 to-[var(--surface)]/80 backdrop-blur-md">
              <CardHeader className="pb-2">
                <CardDescription>Projected Revenue</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {data.predicted_value != null
                    ? `$${Number(data.predicted_value).toLocaleString()}`
                    : "—"}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md">
              <CardHeader className="pb-2">
                <CardDescription>Confidence</CardDescription>
                <CardTitle className="text-3xl tabular-nums">
                  {data.confidence != null ? `${data.confidence}%` : "—"}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md">
              <CardHeader className="pb-2">
                <CardDescription>Period</CardDescription>
                <CardTitle className="text-lg">{data.period_label}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-base">Forecast Trend</CardTitle>
              <CardDescription>Projected vs won revenue by period</CardDescription>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.buckets.map((b) => ({
                    label: String(b.period_label ?? ""),
                    forecast: toNumber(b.forecast_value as string | number | null | undefined),
                    won: toNumber(b.won_value as string | number | null | undefined),
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="forecast"
                    stroke="var(--chart-1)"
                    fill="var(--chart-1)"
                    fillOpacity={0.15}
                    name="Forecast"
                  />
                  <Area
                    type="monotone"
                    dataKey="won"
                    stroke="var(--chart-2)"
                    fill="var(--chart-2)"
                    fillOpacity={0.1}
                    name="Won"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {data.ai_summary ? (
            <Card className="border-[var(--border)]/70 bg-gradient-to-br from-violet-500/10 via-[var(--surface)]/80 to-indigo-500/10 backdrop-blur-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  AI Forecast Explanation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AiMarkdown content={data.ai_summary} />
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
