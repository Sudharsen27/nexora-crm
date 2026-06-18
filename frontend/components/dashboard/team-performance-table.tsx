"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WidgetEmpty } from "@/components/dashboard/widget-states";
import type { DashboardTeamMemberStats } from "@/types/dashboard";
import { formatDashboardCurrency } from "@/lib/dashboard-format";
import { cn } from "@/lib/utils";

interface TeamPerformanceTableProps {
  tenantSlug: string;
  members: DashboardTeamMemberStats[];
  currency?: string;
}

export function TeamPerformanceTable({
  tenantSlug,
  members,
  currency = "USD",
}: TeamPerformanceTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Team performance</CardTitle>
        <CardDescription>Workload and outcomes by team member</CardDescription>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <WidgetEmpty
            title="No team activity yet"
            description="Team metrics appear when members work leads, deals, and tasks."
            actionLabel="Manage team"
            actionHref={`/${tenantSlug}/settings/team`}
          />
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Team performance metrics</caption>
              <thead>
                <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                  <th scope="col" className="pb-3 pr-4 font-medium">
                    Member
                  </th>
                  <th scope="col" className="pb-3 pr-4 font-medium">
                    Open deals
                  </th>
                  <th scope="col" className="pb-3 pr-4 font-medium">
                    Pipeline
                  </th>
                  <th scope="col" className="pb-3 pr-4 font-medium">
                    Tasks
                  </th>
                  <th scope="col" className="pb-3 pr-4 font-medium">
                    Overdue
                  </th>
                  <th scope="col" className="pb-3 pr-4 font-medium">
                    Activities
                  </th>
                  <th scope="col" className="pb-3 font-medium">
                    Won
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.user_id}
                    className="border-b border-[var(--border)]/70 last:border-0 hover:bg-[var(--surface-muted)]/60"
                  >
                    <th scope="row" className="py-3 pr-4 font-medium">
                      <Link
                        href={`/${tenantSlug}/tasks?assigned_to_id=${member.user_id}`}
                        className="hover:text-[var(--primary)] hover:underline"
                      >
                        {member.full_name}
                      </Link>
                    </th>
                    <td className="py-3 pr-4 tabular-nums">{member.open_deals}</td>
                    <td className="py-3 pr-4 tabular-nums">
                      {formatDashboardCurrency(member.pipeline_value, currency)}
                    </td>
                    <td className="py-3 pr-4 tabular-nums">{member.open_tasks}</td>
                    <td className="py-3 pr-4">
                      <Badge
                        variant={member.overdue_tasks > 0 ? "destructive" : "secondary"}
                        className={cn(member.overdue_tasks === 0 && "font-normal")}
                      >
                        {member.overdue_tasks}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 tabular-nums">{member.activities_count}</td>
                    <td className="py-3 tabular-nums">
                      {formatDashboardCurrency(member.won_revenue, currency)}
                      <span className="ml-1 text-xs text-[var(--muted-foreground)]">
                        ({member.won_deals_count})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
