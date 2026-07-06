"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PortalEmptyState, PortalPageError, PortalPageLoading } from "@/components/portal/portal-page-state";
import { getPortalNotifications, markPortalNotificationRead } from "@/lib/api/portal";
import type { PortalNotification } from "@/types/portal";

export function PortalNotificationsPage({ tenantSlug }: { tenantSlug: string }) {
  const [items, setItems] = useState<PortalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    void getPortalNotifications(tenantSlug)
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load notifications"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [tenantSlug]);

  async function markRead(id: string) {
    await markPortalNotificationRead(tenantSlug, id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Updates about documents, meetings, tickets, and more
        </p>
      </div>

      {error && <PortalPageError message={error} />}
      {loading ? (
        <PortalPageLoading label="Loading notifications…" />
      ) : items.length === 0 ? (
        <PortalEmptyState
          title="No notifications yet"
          description="You'll see updates here when your account team shares documents or responds to tickets."
        />
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <Card
              key={n.id}
              className={!n.is_read ? "border-sky-500/30 bg-sky-500/5" : ""}
              onClick={() => {
                if (!n.is_read) void markRead(n.id);
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{n.title}</p>
                  {!n.is_read && <Badge>New</Badge>}
                </div>
                {n.body && <p className="mt-1 text-sm text-[var(--muted-foreground)]">{n.body}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--muted-foreground)]">
                  <span>{new Date(n.created_at).toLocaleString()}</span>
                  {n.link && (
                    <Link
                      href={n.link.startsWith("/") ? n.link : `/portal/${tenantSlug}${n.link}`}
                      className="font-medium text-sky-600 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View details →
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
