"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WidgetEmpty } from "@/components/dashboard/widget-states";
import { formatDashboardCurrency, toNumber } from "@/lib/dashboard-format";

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  qualified: "Qualified",
  proposal: "Proposal",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

interface DealsByStageChartProps {
  tenantSlug: string;
  stages: { stage: string; count: number; value: string | number }[];
  currency?: string;
}

export function DealsByStageChart({ tenantSlug, stages, currency = "USD" }: DealsByStageChartProps) {
  const data = stages.map((s) => ({
    name: STAGE_LABELS[s.stage] ?? s.stage,
    count: s.count,
    value: toNumber(s.value),
  }));
  const hasData = data.some((d) => d.count > 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Deals by stage</CardTitle>
        <CardDescription>Distribution across pipeline stages</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <WidgetEmpty
            title="No deals yet"
            description="Create deals to see stage distribution."
            actionLabel="Create deal"
            actionHref={`/${tenantSlug}/deals`}
          />
        ) : (
          <div className="h-56" role="img" aria-label="Deals by stage horizontal bar chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 4, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={88}
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
                  formatter={(value, name) => [
                    name === "value" ? formatDashboardCurrency(Number(value), currency) : value,
                    name === "value" ? "Value" : "Deals",
                  ]}
                />
                <Bar dataKey="count" fill="var(--chart-2)" radius={[0, 6, 6, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
