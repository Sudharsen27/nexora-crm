"use client";

import { MeetingCard } from "@/components/calendar/meeting-card";
import { formatMeetingDate, groupEventsByDay } from "@/lib/calendar-utils";
import type { CalendarEvent } from "@/types/calendar";

interface CalendarAgendaViewProps {
  events: CalendarEvent[];
  onSelectEvent: (id: string) => void;
}

export function CalendarAgendaView({ events, onSelectEvent }: CalendarAgendaViewProps) {
  const grouped = groupEventsByDay(events);

  if (grouped.size === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-[var(--muted-foreground)]">
        No meetings in this period
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([day, dayEvents]) => (
        <section key={day}>
          <h3 className="mb-3 text-sm font-semibold text-[var(--muted-foreground)]">
            {formatMeetingDate(dayEvents[0].start_datetime)}
          </h3>
          <div className="space-y-2">
            {dayEvents.map((e) => (
              <MeetingCard key={e.id} event={e} onClick={() => onSelectEvent(e.id)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
