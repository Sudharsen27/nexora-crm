"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskDashboardSummary } from "@/types/api";

interface TaskSummaryWidgetProps {
  tenantSlug: string;
  summary: TaskDashboardSummary;
}

export function TaskSummaryWidget({ tenantSlug, summary }: TaskSummaryWidgetProps) {
  const rows = [
    { label: "My open", value: summary.my_open, href: `/${tenantSlug}/tasks` },
    { label: "Overdue", value: summary.my_overdue, href: `/${tenantSlug}/tasks?due=overdue` },
    { label: "Due today", value: summary.my_due_today, href: `/${tenantSlug}/tasks?due=today` },
    { label: "Team open", value: summary.team_open, href: `/${tenantSlug}/tasks` },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tasks summary</CardTitle>
        <CardDescription>Open workload across you and your team</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {rows.map((row) => (
            <Link
              key={row.label}
              href={row.href}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/30 p-3 text-center transition-colors hover:bg-[var(--surface-muted)]"
            >
              <p className="text-2xl font-semibold tabular-nums">{row.value}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{row.label}</p>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
