"use client";

import { MeetingCard } from "@/components/calendar/meeting-card";
import { eventsForDay, formatTime, HOURS } from "@/lib/calendar-utils";
import type { CalendarEvent } from "@/types/calendar";

interface CalendarDayViewProps {
  anchor: Date;
  events: CalendarEvent[];
  onSelectEvent: (id: string) => void;
}

export function CalendarDayView({ anchor, events, onSelectEvent }: CalendarDayViewProps) {
  const dayEvents = eventsForDay(events, anchor);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur">
      <div className="border-b border-[var(--border)] p-4">
        <h2 className="font-semibold">
          {anchor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </h2>
        <p className="text-sm text-[var(--muted-foreground)]">{dayEvents.length} meetings</p>
      </div>
      <div className="grid grid-cols-[60px_1fr]">
        {HOURS.map((hour) => {
          const hourEvents = dayEvents.filter((e) => new Date(e.start_datetime).getHours() === hour);
          return (
            <div key={hour} className="contents">
              <div className="border-b border-[var(--border)] px-2 py-3 text-right text-xs text-[var(--muted-foreground)]">
                {formatTime(new Date(2000, 0, 1, hour))}
              </div>
              <div className="min-h-14 border-b border-l border-[var(--border)] p-1">
                <div className="space-y-1">
                  {hourEvents.map((e) => (
                    <MeetingCard key={e.id} event={e} onClick={() => onSelectEvent(e.id)} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
