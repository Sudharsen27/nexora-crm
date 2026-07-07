"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WidgetEmpty } from "@/components/dashboard/widget-states";
import { toNumber } from "@/lib/dashboard-format";
import type { BiReportRunResult } from "@/types/bi";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

interface BiChartRendererProps {
  chartType: string;
  result: BiReportRunResult;
  title?: string;
  description?: string;
  tenantSlug?: string;
}

function normalizeSeries(result: BiReportRunResult) {
  return result.series.map((row, index) => {
    const label =
      String(row.label ?? row.period ?? row.name ?? row.key ?? `Item ${index + 1}`);
    const value = toNumber(
      (row.value ?? row.revenue ?? row.count ?? 0) as string | number | null | undefined,
    );
    return { label, value, ...row };
  });
}

export function BiChartRenderer({
  chartType,
  result,
  title = "Report",
  description,
}: BiChartRendererProps) {
  const data = normalizeSeries(result);
  const hasData = data.some((d) => d.value > 0);

  return (
    <Card className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="h-[320px]">
        {!hasData ? (
          <WidgetEmpty title="No data" description="Adjust filters or date range and run again." />
        ) : chartType === "pie" || chartType === "donut" ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="label"
                innerRadius={chartType === "donut" ? 60 : 0}
                outerRadius={100}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : chartType === "line" ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : chartType === "area" ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout={chartType === "horizontal_bar" ? "vertical" : "horizontal"}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              {chartType === "horizontal_bar" ? (
                <>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="label" width={100} tick={{ fontSize: 11 }} />
                </>
              ) : (
                <>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                </>
              )}
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

interface BiWidgetChartProps {
  widgetType: string;
  title: string;
  data?: Record<string, unknown> | null;
}

export function BiWidgetChart({ widgetType, title, data }: BiWidgetChartProps) {
  const series = (data?.series as Record<string, unknown>[]) ?? [];
  if (!series.length) return null;

  const fakeResult: BiReportRunResult = {
    report_id: "",
    chart_type: widgetType === "funnel" ? "bar" : widgetType,
    columns: [],
    rows: series,
    series,
    totals: {},
    drill_down: [],
  };

  return <BiChartRenderer chartType={fakeResult.chart_type} result={fakeResult} title={title} />;
}
