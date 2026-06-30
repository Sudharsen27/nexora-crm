"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WidgetEmpty } from "@/components/dashboard/widget-states";
import type { AnalyticsForecastBucket } from "@/types/analytics";
import { formatDashboardCurrency, toNumber } from "@/lib/dashboard-format";

interface SalesForecastChartProps {
  tenantSlug: string;
  buckets: AnalyticsForecastBucket[];
  forecastRevenue: string | number;
  currency?: string;
}

export function SalesForecastChart({
  tenantSlug,
  buckets,
  forecastRevenue,
  currency = "USD",
}: SalesForecastChartProps) {
  const chartData = buckets.map((b) => ({
    label: b.period_label,
    forecast: toNumber(b.forecast_value),
    won: toNumber(b.won_value),
  }));
  const hasData = chartData.some((d) => d.forecast > 0 || d.won > 0);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base">Sales forecast</CardTitle>
          <CardDescription>Weighted pipeline vs won revenue</CardDescription>
        </div>
        <p className="text-sm font-semibold tabular-nums">
          {formatDashboardCurrency(forecastRevenue, currency)}
        </p>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <WidgetEmpty
            title="No forecast data"
            description="Add open deals with probability to see forecast."
            actionLabel="Open pipeline"
            actionHref={`/${tenantSlug}/pipeline`}
          />
        ) : (
          <div className="h-56" role="img" aria-label="Sales forecast chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${Number(v) / 1000}k`}
                  width={48}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "12px",
                  }}
                  formatter={(value, name) => [
                    formatDashboardCurrency(Number(value), currency),
                    name === "forecast" ? "Forecast" : "Won",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="forecast"
                  fill="var(--chart-3)"
                  fillOpacity={0.15}
                  stroke="var(--chart-3)"
                  strokeWidth={2}
                />
                <Line type="monotone" dataKey="won" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
