"use client";

import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WidgetEmpty } from "@/components/dashboard/widget-states";
import { formatRelativeTime } from "@/lib/api/activities";
import { getActivityIconFromFields, getDashboardActivityTitle } from "@/lib/activity-utils";
import type { DashboardActivityItem } from "@/types/dashboard";

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
            description="CRM actions are tracked automatically and will appear here."
            actionLabel="View timeline"
            actionHref={`/${tenantSlug}/activities`}
          />
        ) : (
          <ul className="space-y-3" aria-label="Recent activities">
            {activities.map((activity) => {
              const Icon = activity.icon ? getActivityIconFromFields(activity.icon) : MessageSquare;
              const entityHref =
                activity.entity?.href_path != null
                  ? `/${tenantSlug}/${activity.entity.href_path}`
                  : null;
              const actorName = activity.created_by?.full_name ?? "System";
              const title = getDashboardActivityTitle(activity);

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
                      <span className="font-medium">{actorName}</span>{" "}
                      <span className="text-[var(--muted-foreground)]">·</span> {title}
                      {activity.entity ? (
                        <>
                          {" "}
                          on{" "}
                          {entityHref ? (
                            <Link
                              href={entityHref}
                              className="font-medium text-[var(--primary)] hover:underline"
                            >
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
