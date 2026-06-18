"use client";

import {
  Activity,
  AlertTriangle,
  CalendarCheck,
  CircleDollarSign,
  Clock,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import type { DashboardKpis } from "@/types/dashboard";
import { formatDashboardCurrency } from "@/lib/dashboard-format";
import { KpiCard } from "@/components/dashboard/kpi-card";

interface KpiRowProps {
  tenantSlug: string;
  kpis: DashboardKpis;
}

export function KpiRow({ tenantSlug, kpis }: KpiRowProps) {
  const currency = kpis.currency ?? "USD";
  const cards = [
    kpis.my_open_tasks != null
      ? {
          key: "open-tasks",
          label: "My open tasks",
          value: kpis.my_open_tasks,
          hint: "View assigned tasks",
          href: `/${tenantSlug}/tasks?assigned_to_id=me`,
          icon: Clock,
          tone: "default" as const,
        }
      : null,
    kpis.my_overdue_tasks != null
      ? {
          key: "overdue",
          label: "Overdue tasks",
          value: kpis.my_overdue_tasks,
          hint: "Needs attention",
          href: `/${tenantSlug}/tasks?due=overdue`,
          icon: AlertTriangle,
          tone: "danger" as const,
        }
      : null,
    kpis.my_due_today_tasks != null
      ? {
          key: "due-today",
          label: "Due today",
          value: kpis.my_due_today_tasks,
          hint: "Scheduled for today",
          href: `/${tenantSlug}/tasks?due=today`,
          icon: CalendarCheck,
          tone: "warning" as const,
        }
      : null,
    kpis.open_pipeline_value != null
      ? {
          key: "pipeline",
          label: "Open pipeline",
          value: formatDashboardCurrency(kpis.open_pipeline_value, currency),
          hint: `${kpis.open_pipeline_count ?? 0} active deals`,
          href: `/${tenantSlug}/deals`,
          icon: TrendingUp,
          tone: "default" as const,
        }
      : null,
    kpis.won_revenue != null
      ? {
          key: "won",
          label: "Won revenue",
          value: formatDashboardCurrency(kpis.won_revenue, currency),
          hint: `${kpis.won_deals_count ?? 0} deals won`,
          href: `/${tenantSlug}/deals`,
          icon: CircleDollarSign,
          tone: "success" as const,
        }
      : null,
    kpis.new_leads_count != null
      ? {
          key: "leads",
          label: "New leads",
          value: kpis.new_leads_count,
          hint: "Created in period",
          href: `/${tenantSlug}/leads`,
          icon: UserPlus,
          tone: "default" as const,
        }
      : null,
    kpis.activities_count != null
      ? {
          key: "activities",
          label: "Activities",
          value: kpis.activities_count,
          hint: "Logged in period",
          href: `/${tenantSlug}/activities`,
          icon: Activity,
          tone: "default" as const,
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    value: string | number;
    hint: string;
    href: string;
    icon: typeof Clock;
    tone: "default" | "danger" | "warning" | "success";
  }>;

  if (cards.length === 0) return null;

  return (
    <section aria-label="Key metrics">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ key, ...card }) => (
          <KpiCard key={key} {...card} />
        ))}
      </div>
    </section>
  );
}
