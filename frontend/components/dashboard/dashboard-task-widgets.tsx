"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FaCircleCheck, FaClock, FaTriangleExclamation, FaUsers } from "react-icons/fa6";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTaskSummary } from "@/lib/api/tasks";
import type { TaskDashboardSummary } from "@/types/api";

interface DashboardTaskWidgetsProps {
  tenantSlug: string;
}

export function DashboardTaskWidgets({ tenantSlug }: DashboardTaskWidgetsProps) {
  const [summary, setSummary] = useState<TaskDashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getTaskSummary(tenantSlug)
      .then(setSummary)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load task summary"));
  }, [tenantSlug]);

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!summary) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-8 w-14 rounded bg-zinc-200 dark:bg-zinc-800" />
            </CardHeader>
            <CardContent>
              <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>My open tasks</CardDescription>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl">{summary.my_open}</CardTitle>
              <span className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300">
                <FaClock className="h-4 w-4" />
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Link href={`/${tenantSlug}/tasks?assigned_to_id=me`} className="text-sm text-zinc-500 hover:underline">
              View tasks
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overdue tasks</CardDescription>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl text-red-600">{summary.my_overdue}</CardTitle>
              <span className="rounded-lg bg-red-50 p-2 text-red-600 dark:bg-red-950/30 dark:text-red-300">
                <FaTriangleExclamation className="h-4 w-4" />
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Link href={`/${tenantSlug}/tasks?due=overdue`} className="text-sm text-zinc-500 hover:underline">
              View overdue
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Due today</CardDescription>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl">{summary.my_due_today}</CardTitle>
              <span className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300">
                <FaCircleCheck className="h-4 w-4" />
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Link href={`/${tenantSlug}/tasks?due=today`} className="text-sm text-zinc-500 hover:underline">
              View today
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Team open tasks</CardDescription>
            <div className="flex items-center justify-between">
              <CardTitle className="text-3xl">{summary.team_open}</CardTitle>
              <span className="rounded-lg bg-violet-50 p-2 text-violet-600 dark:bg-violet-950/30 dark:text-violet-300">
                <FaUsers className="h-4 w-4" />
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-500">{summary.team_overdue} overdue team-wide</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-5">
          <CardHeader>
            <CardTitle className="text-base">Sales funnel</CardTitle>
            <CardDescription>Deal progression by stage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Leads", value: 100, color: "bg-violet-500" },
              { label: "Qualified", value: 72, color: "bg-indigo-500" },
              { label: "Proposal", value: 48, color: "bg-blue-500" },
              { label: "Negotiation", value: 30, color: "bg-cyan-500" },
              { label: "Won", value: 18, color: "bg-emerald-500" },
            ].map((stage) => (
              <div key={stage.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                  <span>{stage.label}</span>
                  <span>{stage.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--surface-muted)]">
                  <div className={`h-2 rounded-full ${stage.color}`} style={{ width: `${stage.value}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-7">
          <CardHeader>
            <CardTitle className="text-base">Revenue trend</CardTitle>
            <CardDescription>Monthly performance snapshot</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative h-56 w-full overflow-hidden rounded-xl bg-[var(--surface-muted)] p-4">
              <div className="absolute inset-x-4 bottom-10 top-4 flex items-end gap-3">
                {[38, 52, 46, 63, 58, 71, 64, 82, 76, 88, 80, 92].map((h, idx) => (
                  <div key={idx} className="flex-1 rounded-t-md bg-[var(--primary)]/85" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="absolute inset-x-4 bottom-3 flex justify-between text-[10px] text-[var(--muted-foreground)]">
                <span>Jan</span>
                <span>Apr</span>
                <span>Jul</span>
                <span>Oct</span>
                <span>Dec</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardHeader>
            <CardTitle className="text-base">Recent activities</CardTitle>
            <CardDescription>Latest team updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.by_assignee.slice(0, 5).map((row, idx) => (
              <div key={row.user_id} className="flex items-start gap-3 rounded-xl border border-[var(--border)] p-3">
                <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)]/10 text-xs font-semibold text-[var(--primary)]">
                  {row.full_name
                    .split(" ")
                    .map((part) => part[0] ?? "")
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{row.full_name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {row.open_count} open tasks, {row.overdue_count} overdue
                  </p>
                </div>
                <span className="text-xs text-[var(--muted-foreground)]">{idx + 1}h ago</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-5">
          <CardHeader>
            <CardTitle className="text-base">Deal source</CardTitle>
            <CardDescription>Acquisition mix</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Inbound", value: 42, color: "bg-violet-500" },
              { label: "Referrals", value: 27, color: "bg-sky-500" },
              { label: "Outbound", value: 19, color: "bg-emerald-500" },
              { label: "Partners", value: 12, color: "bg-amber-500" },
            ].map((source) => (
              <div key={source.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--muted-foreground)]">{source.label}</span>
                  <span className="font-medium">{source.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--surface-muted)]">
                  <div className={`h-2 rounded-full ${source.color}`} style={{ width: `${source.value}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
