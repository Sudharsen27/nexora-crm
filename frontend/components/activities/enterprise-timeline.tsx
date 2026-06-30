"use client";

import { useEffect, useRef } from "react";
import { ActivityTimelineCard } from "@/components/activities/activity-timeline-card";
import { Skeleton } from "@/components/ui/skeleton";
import { groupActivitiesByDate } from "@/lib/activity-utils";
import type { Activity } from "@/types/api";

interface EnterpriseTimelineProps {
  tenantSlug: string;
  activities: Activity[];
  loading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onOpen: (activity: Activity) => void;
  onDelete?: (activity: Activity) => void;
  selectedId?: string | null;
  emptyMessage?: string;
}

export function EnterpriseTimeline({
  tenantSlug,
  activities,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  onOpen,
  onDelete,
  selectedId,
  emptyMessage = "No activities yet. Actions across your CRM will appear here automatically.",
}: EnterpriseTimelineProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || !onLoadMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!activities.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-16 text-center">
        <p className="text-lg font-medium">No activity found</p>
        <p className="mt-1 max-w-md text-sm text-[var(--muted-foreground)]">{emptyMessage}</p>
      </div>
    );
  }

  const groups = groupActivitiesByDate(activities);

  return (
    <div className="space-y-8">
      {groups.map(({ group, items }) => (
        <section key={group}>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            {group}
          </h3>
          <div className="relative space-y-4 pl-2">
            <span className="absolute bottom-0 left-[1.35rem] top-0 w-px bg-[var(--border)]" aria-hidden />
            {items.map((activity) => (
              <ActivityTimelineCard
                key={activity.id}
                activity={activity}
                tenantSlug={tenantSlug}
                onOpen={onOpen}
                onDelete={onDelete}
                selected={selectedId === activity.id}
              />
            ))}
          </div>
        </section>
      ))}

      {loadingMore && (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
      )}

      {hasMore && <div ref={sentinelRef} className="h-4" aria-hidden />}
    </div>
  );
}
