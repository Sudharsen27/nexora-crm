"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WidgetEmpty } from "@/components/dashboard/widget-states";
import type { DashboardRevenue } from "@/types/dashboard";
import { formatDashboardCurrency, toNumber } from "@/lib/dashboard-format";

interface RevenueTrendChartProps {
  tenantSlug: string;
  revenue: DashboardRevenue;
  currency?: string;
}

export function RevenueTrendChart({ tenantSlug, revenue, currency = "USD" }: RevenueTrendChartProps) {
  const chartData = revenue.buckets.map((bucket) => ({
    label: bucket.period_label,
    value: toNumber(bucket.value),
    deals: bucket.deal_count,
  }));
  const hasData = chartData.some((d) => d.value > 0);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base">Revenue trend</CardTitle>
          <CardDescription>Won deal value over time</CardDescription>
        </div>
        {hasData ? (
          <div className="text-right text-sm">
            <p className="font-semibold tabular-nums text-[var(--foreground)]">
              {formatDashboardCurrency(revenue.total_value, currency)}
            </p>
            <p className="text-xs text-[var(--muted-foreground)]">
              {revenue.total_deals} deals
              {revenue.win_rate != null ? ` · ${revenue.win_rate}% win rate` : ""}
            </p>
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <WidgetEmpty
            title="No won revenue yet"
            description="Close deals as won to see revenue trends here."
            actionLabel="Open deals"
            actionHref={`/${tenantSlug}/deals`}
          />
        ) : (
          <>
            <div
              className="h-56 w-full"
              role="img"
              aria-label="Revenue trend area chart"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
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
                      color: "var(--foreground)",
                    }}
                    formatter={(value) => [
                      formatDashboardCurrency(Number(value), currency),
                      "Revenue",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#revenueFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <table className="sr-only">
              <caption>Revenue by period</caption>
              <thead>
                <tr>
                  <th scope="col">Period</th>
                  <th scope="col">Revenue</th>
                  <th scope="col">Deals</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((row) => (
                  <tr key={row.label}>
                    <td>{row.label}</td>
                    <td>{formatDashboardCurrency(row.value, currency)}</td>
                    <td>{row.deals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
