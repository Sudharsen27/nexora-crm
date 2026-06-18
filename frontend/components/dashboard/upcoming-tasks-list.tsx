"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WidgetEmpty } from "@/components/dashboard/widget-states";
import type { DashboardUpcomingTask } from "@/types/dashboard";
import { cn } from "@/lib/utils";

const PRIORITY_VARIANT: Record<string, "destructive" | "warning" | "secondary" | "outline"> = {
  urgent: "destructive",
  high: "warning",
  medium: "secondary",
  low: "outline",
};

interface UpcomingTasksListProps {
  tenantSlug: string;
  tasks: DashboardUpcomingTask[];
}

function formatDueLabel(dueDate: string | null | undefined, isOverdue: boolean): string {
  if (!dueDate) return "No due date";
  if (isOverdue) return "Overdue";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${dueDate}T00:00:00`);
  const diff = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff > 1) return `In ${diff} days`;
  return dueDate;
}

export function UpcomingTasksList({ tenantSlug, tasks }: UpcomingTasksListProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">Upcoming tasks</CardTitle>
          <CardDescription>Overdue and next 7 days</CardDescription>
        </div>
        <Link href={`/${tenantSlug}/tasks`} className="text-sm font-medium text-[var(--primary)] hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <WidgetEmpty
            title="No upcoming tasks"
            description="You're all caught up for the week ahead."
            actionLabel="Create task"
            actionHref={`/${tenantSlug}/tasks`}
          />
        ) : (
          <ul className="space-y-2" aria-label="Upcoming tasks">
            {tasks.map((task) => (
              <li key={task.id}>
                <Link
                  href={`/${tenantSlug}/tasks/${task.id}`}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2.5 transition-colors",
                    "hover:border-[var(--primary)]/30 hover:bg-[var(--surface-muted)]/50",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                    task.is_overdue && "border-red-200 dark:border-red-900/40",
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {formatDueLabel(task.due_date, task.is_overdue)}
                      {task.entity ? ` · ${task.entity.display_name}` : ""}
                    </p>
                  </div>
                  <Badge variant={PRIORITY_VARIANT[task.priority] ?? "outline"}>{task.priority}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
