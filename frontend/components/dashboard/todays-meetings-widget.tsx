"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MeetingCard } from "@/components/calendar/meeting-card";
import { WidgetEmpty, WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { getTodayMeetings } from "@/lib/api/meetings";
import { useEffect, useState } from "react";
import type { Meeting } from "@/types/calendar";

interface TodaysMeetingsWidgetProps {
  tenantSlug: string;
}

export function TodaysMeetingsWidget({ tenantSlug }: TodaysMeetingsWidgetProps) {
  const [items, setItems] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTodayMeetings(tenantSlug)
      .then((r) => setItems(r.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [tenantSlug]);

  return (
    <Card className="border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarClock className="h-4 w-4 text-[var(--primary)]" />
          Today&apos;s Meetings
        </CardTitle>
        <Link href={`/${tenantSlug}/calendar`} className="text-xs text-[var(--primary)] hover:underline">
          Open calendar
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <WidgetSkeleton variant="list" />
        ) : error ? (
          <WidgetError title="Could not load meetings" message={error} />
        ) : items.length === 0 ? (
          <WidgetEmpty title="No meetings today" description="Your schedule is clear for today." />
        ) : (
          <div className="space-y-2">
            {items.slice(0, 5).map((m) => (
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
