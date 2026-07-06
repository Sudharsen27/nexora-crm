"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AiWidget } from "@/types/ai";
import { cn } from "@/lib/utils";

function formatChartValue(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return String(value);
}

function KpiCard({ widget }: { widget: Extract<AiWidget, { type: "kpi" }> }) {
  return (
    <Card className="border-[var(--border)]/80 bg-gradient-to-br from-[var(--surface)] to-[var(--surface-muted)]/40 shadow-sm">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
          {widget.label}
        </p>
        <p className="mt-2 text-2xl font-bold tracking-tight">{widget.value}</p>
        {widget.change && (
          <p
            className={cn(
              "mt-1 text-xs font-medium",
              widget.trend === "up" && "text-emerald-600",
              widget.trend === "down" && "text-rose-600",
              widget.trend === "neutral" && "text-[var(--muted-foreground)]",
            )}
          >
            {widget.change}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function TableCard({ widget }: { widget: Extract<AiWidget, { type: "table" }> }) {
  return (
    <Card className="overflow-hidden border-[var(--border)]/80 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-left text-xs">
          <thead className="bg-[var(--surface-muted)]/60">
            <tr>
              {widget.columns.map((col) => (
                <th key={col} className="px-4 py-2.5 font-medium text-[var(--muted-foreground)]">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {widget.rows.map((row, i) => (
              <tr key={i} className="border-t border-[var(--border)]">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-2.5">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function ChartCard({ widget }: { widget: Extract<AiWidget, { type: "chart" }> }) {
  const gradientId = useId().replace(/:/g, "");
  const isBar = widget.chartType === "bar";

  return (
    <Card className="overflow-hidden border-[var(--border)]/80 shadow-sm">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-semibold">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent className="pb-4 pt-0">
        <div className="h-56 w-full" role="img" aria-label={widget.title}>
          <ResponsiveContainer width="100%" height="100%">
            {isBar ? (
              <BarChart
                data={widget.data}
                margin={{ top: 12, right: 12, left: -4, bottom: 0 }}
                barCategoryGap="18%"
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.75} />
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
                  tickFormatter={formatChartValue}
                  width={40}
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-muted)", opacity: 0.5 }}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(value) => [formatChartValue(Number(value)), "Value"]}
                />
                <Bar
                  dataKey="value"
                  fill={`url(#${gradientId})`}
                  radius={[8, 8, 0, 0]}
                  maxBarSize={56}
                />
              </BarChart>
            ) : (
              <AreaChart data={widget.data} margin={{ top: 12, right: 12, left: -4, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
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
                  tickFormatter={formatChartValue}
                  width={40}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(value) => [formatChartValue(Number(value)), "Value"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function TimelineCard({ widget }: { widget: Extract<AiWidget, { type: "timeline" }> }) {
  return (
    <Card className="border-[var(--border)]/80 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {widget.items.map((item, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-16 shrink-0 text-xs font-medium text-violet-600 dark:text-violet-400">
              {item.time}
            </div>
            <div className="border-l-2 border-violet-500/30 pl-3">
              <p className="text-sm font-medium">{item.title}</p>
              {item.detail && (
                <p className="text-xs text-[var(--muted-foreground)]">{item.detail}</p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function InsightCard({ widget }: { widget: Extract<AiWidget, { type: "insight" }> }) {
  const colors = {
    info: "border-sky-500/30 bg-sky-500/5",
    warning: "border-amber-500/30 bg-amber-500/5",
    success: "border-emerald-500/30 bg-emerald-500/5",
  };
  return (
    <div className={cn("rounded-2xl border p-4", colors[widget.severity ?? "info"])}>
      <p className="text-sm font-semibold">{widget.title}</p>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{widget.body}</p>
    </div>
  );
}

function RiskCard({ widget }: { widget: Extract<AiWidget, { type: "risk" }> }) {
  const levelColor = {
    low: "success",
    medium: "warning",
    high: "destructive",
  } as const;
  return (
    <Card className="border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-orange-500/5 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold">{widget.title}</CardTitle>
        <Badge variant={levelColor[widget.level]}>{widget.level} risk</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {widget.deals.map((deal) => (
          <div
            key={deal.name}
            className="flex items-center justify-between rounded-xl bg-[var(--surface)]/80 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-medium">{deal.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{deal.value}</p>
            </div>
            <Badge variant="outline">{deal.probability}%</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ForecastCard({ widget }: { widget: Extract<AiWidget, { type: "forecast" }> }) {
  const gradientId = useId().replace(/:/g, "");
  return (
    <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-indigo-500/5 shadow-sm">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-semibold">{widget.title}</CardTitle>
        <p className="text-xs text-[var(--muted-foreground)]">{widget.period}</p>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight">{widget.predicted}</p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          {widget.confidence}% confidence
        </p>
        <div className="mt-4 h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={widget.data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis hide />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#7c3aed"
                strokeWidth={2}
                fill={`url(#${gradientId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function widgetSpan(widget: AiWidget, layout: "chat" | "grid"): string {
  if (layout === "grid") {
    if (widget.type === "table" || widget.type === "timeline" || widget.type === "insight" || widget.type === "risk") {
      return "sm:col-span-2";
    }
    return "";
  }
  // In chat: charts and wide widgets always full width; KPIs tile in a row
  if (widget.type === "kpi" || widget.type === "forecast") return "";
  return "col-span-full";
}

interface AiWidgetRendererProps {
  widgets: AiWidget[];
  layout?: "chat" | "grid";
}

export function AiWidgetRenderer({ widgets, layout = "grid" }: AiWidgetRendererProps) {
  if (!widgets.length) return null;

  const kpiWidgets = layout === "chat" ? widgets.filter((w) => w.type === "kpi") : [];
  const otherWidgets = layout === "chat" ? widgets.filter((w) => w.type !== "kpi") : widgets;

  if (layout === "chat") {
    return (
      <div className="mt-3 space-y-3">
        {kpiWidgets.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {kpiWidgets.map((widget, i) => (
              <KpiCard key={`kpi-${i}`} widget={widget} />
            ))}
          </div>
        )}
        {otherWidgets.map((widget, i) => {
          const content = (() => {
            switch (widget.type) {
              case "table":
                return <TableCard widget={widget} />;
              case "chart":
                return <ChartCard widget={widget} />;
              case "timeline":
                return <TimelineCard widget={widget} />;
              case "insight":
                return <InsightCard widget={widget} />;
              case "risk":
                return <RiskCard widget={widget} />;
              case "forecast":
                return <ForecastCard widget={widget} />;
              default:
                return null;
            }
          })();
          return content ? <div key={i}>{content}</div> : null;
        })}
      </div>
    );
  }

  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {widgets.map((widget, i) => {
        const span = widgetSpan(widget, layout);
        switch (widget.type) {
          case "kpi":
            return (
              <div key={i} className={span}>
                <KpiCard widget={widget} />
              </div>
            );
          case "table":
            return (
              <div key={i} className={span}>
                <TableCard widget={widget} />
              </div>
            );
          case "chart":
            return (
              <div key={i} className={span}>
                <ChartCard widget={widget} />
              </div>
            );
          case "timeline":
            return (
              <div key={i} className={span}>
                <TimelineCard widget={widget} />
              </div>
            );
          case "insight":
            return (
              <div key={i} className={span}>
                <InsightCard widget={widget} />
              </div>
            );
          case "risk":
            return (
              <div key={i} className={span}>
                <RiskCard widget={widget} />
              </div>
            );
          case "forecast":
            return (
              <div key={i} className={span}>
                <ForecastCard widget={widget} />
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
