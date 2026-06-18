"use client";

import Link from "next/link";
import {
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  StickyNote,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WidgetEmpty } from "@/components/dashboard/widget-states";
import type { DashboardActivityItem } from "@/types/dashboard";
import { formatRelativeTime } from "@/lib/api/activities";

const ACTIVITY_ICONS: Record<string, typeof Phone> = {
  call: Phone,
  meeting: Users,
  email: Mail,
  note: StickyNote,
  task_update: RefreshCw,
  lead_update: RefreshCw,
  deal_update: RefreshCw,
};

interface RecentActivityFeedProps {
  tenantSlug: string;
  activities: DashboardActivityItem[];
}

export function RecentActivityFeed({ tenantSlug, activities }: RecentActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription>Latest team updates across your CRM</CardDescription>
        </div>
        <Link
          href={`/${tenantSlug}/activities`}
          className="text-sm font-medium text-[var(--primary)] hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <WidgetEmpty
            title="No activity yet"
            description="Calls, meetings, and notes will show up here as your team works."
            actionLabel="Log activity"
            actionHref={`/${tenantSlug}/activities`}
          />
        ) : (
          <ul className="space-y-3" aria-label="Recent activities">
            {activities.map((activity) => {
              const Icon = ACTIVITY_ICONS[activity.activity_type] ?? MessageSquare;
              const entityHref =
                activity.entity?.href_path != null
                  ? `/${tenantSlug}/${activity.entity.href_path}`
                  : null;
              return (
                <li
                  key={activity.id}
                  className="flex items-start gap-3 rounded-xl border border-[var(--border)] p-3 transition-colors hover:bg-[var(--surface-muted)]/50"
                >
                  <span
                    className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]"
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[var(--foreground)]">
                      {activity.created_by ? (
                        <span className="font-medium">{activity.created_by.full_name}</span>
                      ) : (
                        <span className="font-medium">Someone</span>
                      )}{" "}
                      logged a {activity.activity_type.replace("_", " ")}
                      {activity.entity ? (
                        <>
                          {" "}
                          on{" "}
                          {entityHref ? (
                            <Link href={entityHref} className="font-medium text-[var(--primary)] hover:underline">
                              {activity.entity.display_name}
                            </Link>
                          ) : (
                            <span className="font-medium">{activity.entity.display_name}</span>
                          )}
                        </>
                      ) : null}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-[var(--muted-foreground)]">
                      {activity.description}
                    </p>
                  </div>
                  <time
                    dateTime={activity.created_at}
                    className="shrink-0 text-xs text-[var(--muted-foreground)]"
                  >
                    {formatRelativeTime(activity.created_at)}
                  </time>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
