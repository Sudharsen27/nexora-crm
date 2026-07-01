"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationCard } from "@/components/notifications/notification-card";
import { useNotificationCenter } from "@/contexts/notification-context";
import { usePermissions } from "@/contexts/permissions-context";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import type { Notification } from "@/types/notification";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  tenantSlug: string;
}

export function NotificationBell({ tenantSlug }: NotificationBellProps) {
  const router = useRouter();
  const { can } = usePermissions();
  const canRead = can("notification:read");
  const { unreadCount, refreshUnread } = useNotificationCenter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function loadDropdown() {
    setLoading(true);
    try {
      const data = await listNotifications(tenantSlug, { page_size: 8 });
      setItems(data.items);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next) await loadDropdown();
  }

  async function handleMarkRead(n: Notification) {
    await markNotificationRead(tenantSlug, n.id);
    setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, read: true } : i)));
    await refreshUnread();
  }

  async function handleMarkAll() {
    await markAllNotificationsRead(tenantSlug);
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    await refreshUnread();
  }

  function handleOpenNotification(n: Notification) {
    void handleMarkRead(n);
    setOpen(false);
    if (n.action_url) router.push(n.action_url);
  }

  if (!canRead) return null;

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="sm"
        className="relative hidden md:inline-flex"
        onClick={() => void handleOpen()}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xl">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">Notifications</p>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => void handleMarkAll()} title="Mark all read">
                <CheckCheck className="h-4 w-4" />
              </Button>
              <Link
                href={`/${tenantSlug}/notifications`}
                className={cn("self-center px-2 text-xs text-[var(--primary)] hover:underline")}
                onClick={() => setOpen(false)}
              >
                View all
              </Link>
            </div>
          </div>
          {loading ? (
            <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">Loading...</p>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">No notifications</p>
          ) : (
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {items.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  compact
                  onMarkRead={handleMarkRead}
                  onOpen={handleOpenNotification}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
