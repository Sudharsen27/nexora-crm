"use client";

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

const CHART_COLOR = "var(--primary)";

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
        <CardTitle className="text-sm">{widget.title}</CardTitle>
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
  const Chart = widget.chartType === "bar" ? BarChart : AreaChart;
  return (
    <Card className="border-[var(--border)]/80 shadow-sm">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm">{widget.title}</CardTitle>
      </CardHeader>
      <CardContent className="h-48 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <Chart data={widget.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
              }}
            />
            {widget.chartType === "bar" ? (
              <Bar dataKey="value" fill={CHART_COLOR} radius={[6, 6, 0, 0]} />
            ) : (
              <Area
                type="monotone"
                dataKey="value"
                stroke={CHART_COLOR}
                fill={CHART_COLOR}
                fillOpacity={0.15}
              />
            )}
          </Chart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function TimelineCard({ widget }: { widget: Extract<AiWidget, { type: "timeline" }> }) {
  return (
    <Card className="border-[var(--border)]/80 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{widget.title}</CardTitle>
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
    <div
      className={cn(
        "rounded-2xl border p-4",
        colors[widget.severity ?? "info"],
      )}
    >
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
        <CardTitle className="text-sm">{widget.title}</CardTitle>
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
  return (
    <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-indigo-500/5 shadow-sm">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm">{widget.title}</CardTitle>
        <p className="text-xs text-[var(--muted-foreground)]">{widget.period}</p>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tracking-tight">{widget.predicted}</p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
          {widget.confidence}% confidence
        </p>
        <div className="mt-4 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={widget.data}>
              <defs>
                <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis hide />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                fill="url(#forecastGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function AiWidgetRenderer({ widgets }: { widgets: AiWidget[] }) {
  if (!widgets.length) return null;
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {widgets.map((widget, i) => {
        switch (widget.type) {
          case "kpi":
            return <KpiCard key={i} widget={widget} />;
          case "table":
            return <div key={i} className="sm:col-span-2"><TableCard widget={widget} /></div>;
          case "chart":
            return <ChartCard key={i} widget={widget} />;
          case "timeline":
            return <div key={i} className="sm:col-span-2"><TimelineCard widget={widget} /></div>;
          case "insight":
            return <div key={i} className="sm:col-span-2"><InsightCard widget={widget} /></div>;
          case "risk":
            return <div key={i} className="sm:col-span-2"><RiskCard widget={widget} /></div>;
          case "forecast":
            return <ForecastCard key={i} widget={widget} />;
          default:
            return null;
        }
      })}
    </div>
  );
}
