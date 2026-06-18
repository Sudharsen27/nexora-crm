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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WidgetEmpty } from "@/components/dashboard/widget-states";
import type { DashboardLeadAnalytics } from "@/types/dashboard";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "#f59e0b",
];

interface LeadAnalyticsChartsProps {
  tenantSlug: string;
  leads: DashboardLeadAnalytics;
}

export function LeadAnalyticsCharts({ tenantSlug, leads }: LeadAnalyticsChartsProps) {
  const sourceData = leads.by_source.map((item) => ({
    name: item.label,
    count: item.count,
    percent: item.percent,
  }));
  const statusData = leads.by_status.map((item) => ({
    name: item.label,
    value: item.count,
    percent: item.percent,
  }));
  const hasSource = sourceData.some((d) => d.count > 0);
  const hasStatus = statusData.some((d) => d.value > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leads by source</CardTitle>
          <CardDescription>New leads in selected period</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasSource ? (
            <WidgetEmpty
              title="No leads captured"
              description="Add leads to understand which channels perform best."
              actionLabel="Create lead"
              actionHref={`/${tenantSlug}/leads/new`}
            />
          ) : (
            <div className="h-52" role="img" aria-label="Leads by source bar chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceData} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                    }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {sourceData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lead status mix</CardTitle>
          <CardDescription>
            Current pipeline snapshot
            {leads.conversion_rate != null ? ` · ${leads.conversion_rate}% converted` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasStatus ? (
            <WidgetEmpty
              title="No active leads"
              description="Your lead status breakdown will appear here."
              actionLabel="View leads"
              actionHref={`/${tenantSlug}/leads`}
            />
          ) : (
            <div className="h-52" role="img" aria-label="Lead status distribution chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={78}
                    paddingAngle={2}
                  >
                    {statusData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
