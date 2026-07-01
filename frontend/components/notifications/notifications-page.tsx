"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NotificationCard } from "@/components/notifications/notification-card";
import { useNotificationCenter } from "@/contexts/notification-context";
import { usePermissions } from "@/contexts/permissions-context";
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/notifications";
import { groupNotificationsByDate } from "@/lib/notification-utils";
import type { Notification, NotificationCategory } from "@/types/notification";

const CATEGORIES: { value: NotificationCategory; label: string }[] = [
  { value: "all", label: "All" },
  { value: "deals", label: "Deals" },
  { value: "companies", label: "Companies" },
  { value: "contacts", label: "Contacts" },
  { value: "tasks", label: "Tasks" },
  { value: "meetings", label: "Meetings" },
  { value: "notes", label: "Notes" },
  { value: "system", label: "System" },
];

interface NotificationsPageProps {
  tenantSlug: string;
}

export function NotificationsPage({ tenantSlug }: NotificationsPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canDelete } = usePermissions();
  const { refreshUnread } = useNotificationCenter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const category = (searchParams.get("category") as NotificationCategory) || "all";
  const q = searchParams.get("q") ?? "";
  const [searchInput, setSearchInput] = useState(q);

  const load = useCallback(
    async (append = false, cursorValue?: string | null) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await listNotifications(tenantSlug, {
          category,
          q: q || undefined,
          cursor: cursorValue ?? undefined,
          page_size: 20,
        });
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setCursor(data.next_cursor);
        setHasMore(data.has_more);
        await refreshUnread();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load notifications");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [tenantSlug, category, q, refreshUnread],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && cursor) void load(true, cursor);
    }, { rootMargin: "200px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, cursor, load]);

  const groups = groupNotificationsByDate(items);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Notification Center</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Stay on top of CRM activity across your workspace</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void markAllNotificationsRead(tenantSlug).then(() => load(false))}>
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat.value}
            size="sm"
            variant={category === cat.value ? "default" : "outline"}
            onClick={() => router.push(`/${tenantSlug}/notifications?category=${cat.value}`)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const params = new URLSearchParams(searchParams.toString());
          if (searchInput.trim()) params.set("q", searchInput.trim());
          else params.delete("q");
          router.push(`/${tenantSlug}/notifications?${params.toString()}`);
        }}
      >
        <Input placeholder="Search notifications..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        <Button type="submit">Search</Button>
      </form>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-[var(--surface-muted)]" />
          ))}
        </div>
      ) : !items.length ? (
        <div className="rounded-2xl border border-dashed py-16 text-center text-[var(--muted-foreground)]">
          No notifications yet
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(({ group, items: groupItems }) => (
            <section key={group}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{group}</h2>
              <div className="space-y-3">
                {groupItems.map((n) => (
                  <NotificationCard
                    key={n.id}
                    notification={n}
                    onMarkRead={async (item) => {
                      await markNotificationRead(tenantSlug, item.id);
                      await load(false);
                    }}
                    onDelete={
                      canDelete("notification")
                        ? async (item) => {
                            await deleteNotification(tenantSlug, item.id);
                            await load(false);
                          }
                        : undefined
                    }
                    onOpen={async (item) => {
                      if (!item.read) await markNotificationRead(tenantSlug, item.id);
                      if (item.action_url) router.push(item.action_url);
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
          {loadingMore ? <div className="h-20 animate-pulse rounded-xl bg-[var(--surface-muted)]" /> : null}
          {hasMore ? <div ref={sentinelRef} className="h-4" /> : null}
        </div>
      )}
    </div>
  );
}
