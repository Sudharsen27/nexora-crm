"use client";

import {
  Activity,
  Briefcase,
  CalendarCheck,
  CircleDollarSign,
  Target,
  TrendingUp,
  UserCheck,
  UserPlus,
  XCircle,
} from "lucide-react";
import type { AnalyticsKpiCard } from "@/types/analytics";
import { KpiCard } from "@/components/dashboard/kpi-card";

const KPI_ICONS: Record<string, typeof Activity> = {
  total_revenue: CircleDollarSign,
  pipeline_value: TrendingUp,
  deals_won: Briefcase,
  deals_lost: XCircle,
  forecast_revenue: Target,
  average_deal_size: CircleDollarSign,
  new_leads: UserPlus,
  qualified_leads: UserCheck,
  conversion_rate: Target,
  tasks_due_today: CalendarCheck,
  meetings_today: CalendarCheck,
  open_activities: Activity,
};

const KPI_TONES: Record<string, "default" | "danger" | "warning" | "success"> = {
  deals_lost: "danger",
  tasks_due_today: "warning",
  deals_won: "success",
  total_revenue: "success",
};

interface AnalyticsKpiRowProps {
  tenantSlug: string;
  kpis: AnalyticsKpiCard[];
  loading?: boolean;
}

export function AnalyticsKpiRow({ tenantSlug, kpis, loading }: AnalyticsKpiRowProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
        ))}
      </div>
    );
  }

  if (!kpis.length) return null;

  return (
    <section aria-label="Executive KPIs">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = KPI_ICONS[kpi.key] ?? Activity;
          return (
            <KpiCard
              key={kpi.key}
              label={kpi.label}
              value={kpi.formatted_value}
              href={kpi.href_path ?? undefined}
              icon={Icon}
              tone={KPI_TONES[kpi.key] ?? "default"}
              growthPercent={kpi.growth_percent}
              comparisonLabel={kpi.comparison_label}
              trend={kpi.trend}
            />
          );
        })}
      </div>
    </section>
  );
}
