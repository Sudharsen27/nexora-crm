"use client";

import Link from "next/link";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { toNumber } from "@/lib/dashboard-format";

export interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  icon: LucideIcon;
  tone?: "default" | "danger" | "warning" | "success";
  className?: string;
  growthPercent?: number | null;
  comparisonLabel?: string;
  trend?: { label: string; value: string | number }[];
}

const toneStyles = {
  default: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
};

export function KpiCard({
  label,
  value,
  hint,
  href,
  icon: Icon,
  tone = "default",
  className,
  growthPercent,
  comparisonLabel = "vs last period",
  trend,
}: KpiCardProps) {
  const trendData = (trend ?? []).map((p) => ({ label: p.label, value: toNumber(p.value) }));
  const hasTrend = trendData.some((d) => d.value > 0);
  const growthUp = growthPercent != null && growthPercent >= 0;

  const content = (
    <Card
      className={cn(
        "h-full border-[var(--border)]/80 bg-[var(--surface)]/80 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:shadow-lg",
        href && "cursor-pointer hover:border-[var(--primary)]/30",
        className,
      )}
    >
      <CardHeader className="pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wide">{label}</CardDescription>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle
              className={cn(
                "text-2xl tabular-nums tracking-tight sm:text-3xl",
                tone === "danger" && "text-red-600 dark:text-red-400",
              )}
            >
              {value}
            </CardTitle>
            {growthPercent != null ? (
              <p
                className={cn(
                  "mt-1 flex items-center gap-1 text-xs font-medium",
                  growthUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                )}
              >
                {growthUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {Math.abs(growthPercent)}% {comparisonLabel}
              </p>
            ) : null}
          </div>
          <span className={cn("shrink-0 rounded-xl p-2.5", toneStyles[tone])} aria-hidden>
            <Icon className="h-4 w-4" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {hasTrend ? (
          <div className="h-10 w-full opacity-80" aria-hidden>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id={`kpi-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--chart-1)"
                  strokeWidth={1.5}
                  fill={`url(#kpi-${label})`}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : null}
        {hint ? <p className="text-sm text-[var(--muted-foreground)]">{hint}</p> : null}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      >
        {content}
      </Link>
    );
  }

  return content;
}
