"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WidgetEmpty } from "@/components/dashboard/widget-states";
import type { DashboardCalendarDay } from "@/types/dashboard";
import { cn } from "@/lib/utils";

interface CalendarStripProps {
  tenantSlug: string;
  days: DashboardCalendarDay[];
}

function localDateISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDayLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  const isToday = dateStr === localDateISO();
  const weekday = date.toLocaleDateString(undefined, { weekday: "short" });
  const dayNum = date.getDate();
  return isToday ? `Today ${dayNum}` : `${weekday} ${dayNum}`;
}

export function CalendarStrip({ tenantSlug, days }: CalendarStripProps) {
  const hasItems = days.some((d) => d.task_count + d.meeting_count + d.call_count > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">This week</CardTitle>
        <CardDescription>Tasks, meetings, and calls on your schedule</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasItems ? (
          <WidgetEmpty
            title="Nothing scheduled"
            description="Add due dates to tasks or schedule meetings to populate your week."
            actionLabel="View tasks"
            actionHref={`/${tenantSlug}/tasks`}
          />
        ) : (
          <div
            className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7"
            role="list"
            aria-label="Weekly calendar"
          >
            {days.map((day) => {
              const total = day.task_count + day.meeting_count + day.call_count;
              const isToday = day.date === localDateISO();
              return (
                <Link
                  key={day.date}
                  href={`/${tenantSlug}/calendar?date=${day.date}`}
                  role="listitem"
                  className={cn(
                    "flex min-h-[6.5rem] flex-col rounded-xl border border-[var(--border)] p-3 transition-colors",
                    "hover:border-[var(--primary)]/30 hover:bg-[var(--surface-muted)]/50",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                    isToday && "border-[var(--primary)]/40 bg-[var(--primary)]/5",
                  )}
                >
                  <p className="text-xs font-medium text-[var(--muted-foreground)]">
                    {formatDayLabel(day.date)}
                  </p>
                  <p className="mt-2 text-2xl font-semibold tabular-nums">{total}</p>
                  <div className="mt-auto flex flex-wrap gap-1 pt-2 text-[10px] text-[var(--muted-foreground)]">
                    {day.task_count > 0 ? <span>{day.task_count} tasks</span> : null}
                    {day.meeting_count > 0 ? <span>{day.meeting_count} mtgs</span> : null}
                    {day.call_count > 0 ? <span>{day.call_count} calls</span> : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
