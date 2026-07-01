"use client";

import { MeetingCard } from "@/components/calendar/meeting-card";
import { eventsForDay, getMonthGrid, isCurrentMonth, isSameDay } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types/calendar";

interface CalendarMonthViewProps {
  anchor: Date;
  events: CalendarEvent[];
  onSelectDay: (day: Date) => void;
  onSelectEvent: (id: string) => void;
}

export function CalendarMonthView({ anchor, events, onSelectDay, onSelectEvent }: CalendarMonthViewProps) {
  const days = getMonthGrid(anchor);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur">
      <div className="grid grid-cols-7 border-b border-[var(--border)]">
        {weekdays.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-[var(--muted-foreground)]">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = eventsForDay(events, day);
          const today = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              role="button"
              tabIndex={0}
              onClick={() => onSelectDay(day)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectDay(day);
                }
              }}
              className={cn(
                "min-h-28 cursor-pointer border-b border-r border-[var(--border)] p-1 text-left transition hover:bg-black/[0.03] dark:hover:bg-white/[0.03]",
                !isCurrentMonth(day, anchor) && "bg-black/[0.02] text-[var(--muted-foreground)] dark:bg-white/[0.02]",
              )}
            >
              <span className={cn("inline-flex h-7 w-7 items-center justify-center rounded-full text-sm", today && "bg-[var(--primary)] text-white")}>
                {day.getDate()}
              </span>
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 3).map((e) => (
                  <MeetingCard
                    key={e.id}
                    event={e}
                    compact
                    onClick={() => onSelectEvent(e.id)}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <p className="px-1 text-[10px] text-[var(--muted-foreground)]">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
