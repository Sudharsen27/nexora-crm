"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WidgetEmpty } from "@/components/dashboard/widget-states";
import type { DashboardFunnel } from "@/types/dashboard";
import { formatDashboardCurrency } from "@/lib/dashboard-format";
import { cn } from "@/lib/utils";

const STAGE_COLORS = [
  "bg-violet-500",
  "bg-indigo-500",
  "bg-blue-500",
  "bg-cyan-500",
  "bg-emerald-500",
];

interface SalesFunnelChartProps {
  tenantSlug: string;
  funnel: DashboardFunnel;
  currency?: string;
}

export function SalesFunnelChart({ tenantSlug, funnel, currency = "USD" }: SalesFunnelChartProps) {
  const maxCount = Math.max(...funnel.stages.map((s) => s.count), 1);
  const hasData = funnel.stages.some((s) => s.count > 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Sales funnel</CardTitle>
        <CardDescription>Deal progression by stage</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <WidgetEmpty
            title="No deals in pipeline"
            description="Create your first deal to see funnel analytics."
            actionLabel="Create deal"
            actionHref={`/${tenantSlug}/deals`}
          />
        ) : (
          <>
            <div
              className="space-y-3"
              role="img"
              aria-label="Sales funnel chart showing deal count by stage"
            >
              {funnel.stages.map((stage, index) => (
                <div key={stage.slug} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-[var(--foreground)]">{stage.label}</span>
                    <span className="text-[var(--muted-foreground)]">
                      {stage.count} · {formatDashboardCurrency(stage.value, currency)}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                    <div
                      className={cn("h-full rounded-full transition-all", STAGE_COLORS[index % STAGE_COLORS.length])}
                      style={{ width: `${Math.max((stage.count / maxCount) * 100, stage.count > 0 ? 8 : 0)}%` }}
                      aria-hidden
                    />
                  </div>
                </div>
              ))}
            </div>
            <table className="sr-only">
              <caption>Deal funnel data</caption>
              <thead>
                <tr>
                  <th scope="col">Stage</th>
                  <th scope="col">Count</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                {funnel.stages.map((stage) => (
                  <tr key={stage.slug}>
                    <td>{stage.label}</td>
                    <td>{stage.count}</td>
                    <td>{formatDashboardCurrency(stage.value, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-4 text-xs text-[var(--muted-foreground)]">
              {funnel.lost_count} lost ·{" "}
              <Link href={`/${tenantSlug}/deals`} className="text-[var(--primary)] hover:underline">
                View pipeline
              </Link>
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
