"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WidgetEmpty } from "@/components/dashboard/widget-states";
import { NotificationCard } from "@/components/notifications/notification-card";
import { useNotificationCenter } from "@/contexts/notification-context";
import { listNotifications } from "@/lib/api/notifications";
import type { Notification } from "@/types/notification";
import { useEffect, useState } from "react";

interface LatestNotificationsWidgetProps {
  tenantSlug: string;
}

export function LatestNotificationsWidget({ tenantSlug }: LatestNotificationsWidgetProps) {
  const { unreadCount } = useNotificationCenter();
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => {
    void listNotifications(tenantSlug, { page_size: 5 }).then((data) => setItems(data.items));
  }, [tenantSlug]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Latest notifications</CardTitle>
          <CardDescription>{unreadCount} unread</CardDescription>
        </div>
        <Link href={`/${tenantSlug}/notifications`} className="text-sm font-medium text-[var(--primary)] hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <WidgetEmpty title="No notifications" description="Updates will appear here automatically." />
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <NotificationCard key={n.id} notification={n} compact />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
