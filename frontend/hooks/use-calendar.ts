"use client";

import { useCallback, useEffect, useState } from "react";
import { getCalendar, getMeetingStatistics } from "@/lib/api/meetings";
import { getCalendarRange } from "@/lib/calendar-utils";
import type { CalendarEvent, CalendarView, MeetingStatistics } from "@/types/calendar";

export function useCalendar(
  tenantSlug: string,
  view: CalendarView,
  anchor: Date,
  filters?: { meeting_type?: string; status?: string; organizer_id?: string }
) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [statistics, setStatistics] = useState<MeetingStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { start, end } = getCalendarRange(view, anchor);
      const [calendar, stats] = await Promise.all([
        getCalendar(tenantSlug, {
          start: start.toISOString(),
          end: end.toISOString(),
          ...filters,
        }),
        getMeetingStatistics(tenantSlug),
      ]);
      setEvents(calendar.items);
      setStatistics(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, view, anchor, filters?.meeting_type, filters?.status, filters?.organizer_id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { events, statistics, loading, error, refresh };
}
