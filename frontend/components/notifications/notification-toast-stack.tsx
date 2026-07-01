"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useNotificationCenter } from "@/contexts/notification-context";
import { getNotificationIcon } from "@/lib/notification-utils";
import { formatRelativeTime } from "@/lib/api/activities";

export function NotificationToastStack() {
  const { toasts, dismissToast } = useNotificationCenter();

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map(({ id, notification }) => {
        const Icon = getNotificationIcon(notification);
        const content = (
          <div className="pointer-events-auto flex gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-lg animate-in slide-in-from-right">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{notification.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-[var(--muted-foreground)]">{notification.message}</p>
              <p className="mt-1 text-[10px] text-[var(--muted-foreground)]">{formatRelativeTime(notification.created_at)}</p>
            </div>
            <button type="button" className="shrink-0 rounded-lg p-1 hover:bg-[var(--surface-muted)]" onClick={() => dismissToast(id)} aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
        return notification.action_url ? (
          <Link key={id} href={notification.action_url} onClick={() => dismissToast(id)}>
            {content}
          </Link>
        ) : (
          <div key={id}>{content}</div>
        );
      })}
    </div>
  );
}
