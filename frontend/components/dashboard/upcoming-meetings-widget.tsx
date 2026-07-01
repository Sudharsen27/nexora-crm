"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Video } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MeetingCard } from "@/components/calendar/meeting-card";
import { WidgetEmpty, WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { getUpcomingMeetings } from "@/lib/api/meetings";
import type { Meeting } from "@/types/calendar";

interface UpcomingMeetingsWidgetProps {
  tenantSlug: string;
}

export function UpcomingMeetingsWidget({ tenantSlug }: UpcomingMeetingsWidgetProps) {
  const [items, setItems] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUpcomingMeetings(tenantSlug, 6)
      .then((r) => setItems(r.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [tenantSlug]);

  return (
    <Card className="border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Video className="h-4 w-4 text-[var(--primary)]" />
          Upcoming Meetings
        </CardTitle>
        <Link href={`/${tenantSlug}/calendar`} className="text-xs text-[var(--primary)] hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <WidgetSkeleton variant="list" />
        ) : error ? (
          <WidgetError title="Could not load meetings" message={error} />
        ) : items.length === 0 ? (
          <WidgetEmpty title="No upcoming meetings" description="Schedule a meeting from the calendar." />
        ) : (
          <div className="space-y-2">
            {items.map((m) => (
              <Link key={m.id} href={`/${tenantSlug}/calendar?meeting=${m.id}`}>
                <MeetingCard event={m} compact />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
