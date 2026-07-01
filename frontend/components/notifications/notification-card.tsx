"use client";

import Link from "next/link";
import { ExternalLink, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { formatRelativeTime } from "@/lib/api/activities";
import { getNotificationIcon, getPriorityClass } from "@/lib/notification-utils";
import type { Notification } from "@/types/notification";
import { cn } from "@/lib/utils";

interface NotificationCardProps {
  notification: Notification;
  compact?: boolean;
  onMarkRead?: (notification: Notification) => void;
  onDelete?: (notification: Notification) => void;
  onOpen?: (notification: Notification) => void;
}

export function NotificationCard({
  notification,
  compact,
  onMarkRead,
  onDelete,
  onOpen,
}: NotificationCardProps) {
  const Icon = getNotificationIcon(notification);
  const href = notification.action_url ?? undefined;

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border border-[var(--border)] p-3 transition-colors",
        !notification.read && "bg-[var(--primary)]/5",
        compact ? "p-2.5" : "p-4",
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)]">
        <Icon className="h-4 w-4 text-[var(--primary)]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium">{notification.title}</p>
            <p className="mt-0.5 text-xs text-[var(--muted-foreground)] line-clamp-2">{notification.message}</p>
          </div>
          <Badge className={cn("shrink-0 text-[10px]", getPriorityClass(notification.priority))}>
            {notification.priority}
          </Badge>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <time dateTime={notification.created_at}>{formatRelativeTime(notification.created_at)}</time>
          {notification.actor ? <span>· {notification.actor.full_name}</span> : null}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {href ? (
            <Link href={href} className={buttonVariants({ size: "sm", variant: "outline" })} onClick={() => onOpen?.(notification)}>
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </Link>
          ) : null}
          {!notification.read && onMarkRead ? (
            <Button size="sm" variant="ghost" onClick={() => onMarkRead(notification)}>
              Mark read
            </Button>
          ) : null}
          {onDelete ? (
            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => onDelete(notification)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
