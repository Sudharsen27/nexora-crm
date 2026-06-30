"use client";

import Link from "next/link";
import { ExternalLink, MoreHorizontal, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { usePermissions } from "@/contexts/permissions-context";
import { formatRelativeTime, getActivityTitle } from "@/lib/api/activities";
import {
  getActivityColorClass,
  getActivityIcon,
  getActorInitials,
  getActorName,
} from "@/lib/activity-utils";
import type { Activity } from "@/types/api";
import { cn } from "@/lib/utils";

interface ActivityTimelineCardProps {
  activity: Activity;
  tenantSlug: string;
  onOpen: (activity: Activity) => void;
  onDelete?: (activity: Activity) => void;
  selected?: boolean;
}

export function ActivityTimelineCard({
  activity,
  tenantSlug,
  onOpen,
  onDelete,
  selected,
}: ActivityTimelineCardProps) {
  const { canDelete, loading } = usePermissions();
  const canRemove = !loading && canDelete("activity");
  const Icon = getActivityIcon(activity);
  const entityHref = activity.entity?.href_path ?? null;

  return (
    <div
      className={cn(
        "group relative flex gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm transition-all hover:shadow-md",
        selected && "ring-2 ring-[var(--primary)]/40",
      )}
    >
      <div className="flex shrink-0 flex-col items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/10 text-sm font-semibold text-[var(--primary)]">
          {getActorInitials(activity)}
        </div>
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            getActivityColorClass(activity),
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--foreground)]">
              {getActorName(activity)}{" "}
              <span className="font-normal text-[var(--muted-foreground)]">·</span>{" "}
              {getActivityTitle(activity)}
            </p>
            {activity.entity && (
              <p className="mt-0.5 text-sm">
                {entityHref ? (
                  <Link href={entityHref} className="font-medium text-[var(--primary)] hover:underline">
                    {activity.entity.display_name}
                  </Link>
                ) : (
                  <span className="font-medium">{activity.entity.display_name}</span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Badge className={cn("text-[10px] font-medium", getActivityColorClass(activity))}>
              {activity.action.replace(/_/g, " ")}
            </Badge>
            <time className="text-xs text-[var(--muted-foreground)]" dateTime={activity.created_at}>
              {formatRelativeTime(activity.created_at)}
            </time>
          </div>
        </div>

        <p className="mt-2 text-sm text-[var(--muted-foreground)] line-clamp-2">{activity.description}</p>

        <div className="mt-3 flex flex-wrap gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button size="sm" variant="outline" onClick={() => onOpen(activity)}>
            <ExternalLink className="h-3.5 w-3.5" />
            Open
          </Button>
          {entityHref && (
            <Link href={entityHref} className={buttonVariants({ size: "sm", variant: "ghost" })}>
              View entity
            </Link>
          )}
          {canRemove && onDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 dark:text-red-400"
              onClick={() => onDelete(activity)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      <button
        type="button"
        className="absolute right-3 top-3 rounded-lg p-1 opacity-0 transition-opacity hover:bg-[var(--surface-muted)] group-hover:opacity-100"
        onClick={() => onOpen(activity)}
        aria-label="More actions"
      >
        <MoreHorizontal className="h-4 w-4 text-[var(--muted-foreground)]" />
      </button>
    </div>
  );
}
