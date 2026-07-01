"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { MeetingCard } from "@/components/calendar/meeting-card";
import { eventHeightPercent, eventTopPercent, eventsForDay, formatDayKey, formatTime, getWeekDays, parseDate, startOfDay } from "@/lib/calendar-utils";
import type { CalendarEvent } from "@/types/calendar";

function DraggableMeeting({ event, onClick }: { event: CalendarEvent; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: event.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={{ ...style, top: `${eventTopPercent(event.start_datetime)}%`, height: `${eventHeightPercent(event.start_datetime, event.end_datetime)}%` }}
      className={`absolute left-1 right-1 z-10 ${isDragging ? "opacity-50" : ""}`}
      {...listeners}
      {...attributes}
    >
      <MeetingCard event={event} compact onClick={onClick} />
    </div>
  );
}

function HourDropZone({ dayKey, hour, children }: { dayKey: string; hour: number; children?: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `${dayKey}-${hour}` });
  return (
    <div ref={setNodeRef} className={`relative h-12 border-b border-[var(--border)]/50 ${isOver ? "bg-[var(--primary)]/10" : ""}`}>
      {children}
    </div>
  );
}

interface CalendarWeekViewProps {
  anchor: Date;
  events: CalendarEvent[];
  onSelectEvent: (id: string) => void;
  onReschedule: (eventId: string, newStart: Date, newEnd: Date) => Promise<void>;
}

export function CalendarWeekView({ anchor, events, onSelectEvent, onReschedule }: CalendarWeekViewProps) {
  const days = getWeekDays(anchor);
  const [active, setActive] = useState<CalendarEvent | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  async function handleDragEnd(event: DragEndEvent) {
    setActive(null);
    const meeting = events.find((e) => e.id === event.active.id);
    const overId = event.over?.id;
    if (!meeting || !overId) return;
    const [dayKey, hourStr] = String(overId).split("-");
    const hour = Number(hourStr);
    const day = days.find((d) => formatDayKey(d) === dayKey);
    if (!day || Number.isNaN(hour)) return;
    const oldStart = parseDate(meeting.start_datetime);
    const oldEnd = parseDate(meeting.end_datetime);
    const duration = oldEnd.getTime() - oldStart.getTime();
    const newStart = startOfDay(day);
    newStart.setHours(hour, 0, 0, 0);
    const newEnd = new Date(newStart.getTime() + duration);
    await onReschedule(meeting.id, newStart, newEnd);
  }

  return (
    <DndContext sensors={sensors} onDragStart={(e) => setActive(events.find((x) => x.id === e.active.id) ?? null)} onDragEnd={(e) => void handleDragEnd(e)}>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur">
        <div className="grid min-w-[800px] grid-cols-[60px_repeat(7,1fr)]">
          <div />
          {days.map((day) => (
            <div key={day.toISOString()} className="border-b border-l border-[var(--border)] p-2 text-center text-sm font-medium">
              {day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </div>
          ))}
          {Array.from({ length: 24 }, (_, hour) => (
            <div key={hour} className="contents">
              <div className="border-b border-[var(--border)] pr-2 text-right text-[10px] text-[var(--muted-foreground)]">
                {formatTime(new Date(2000, 0, 1, hour))}
              </div>
              {days.map((day) => {
                const dayKey = formatDayKey(day);
                const dayEvents = eventsForDay(events, day).filter((e) => parseDate(e.start_datetime).getHours() === hour);
                return (
                  <HourDropZone key={`${dayKey}-${hour}`} dayKey={dayKey} hour={hour}>
                    {dayEvents.map((e) => (
                      <DraggableMeeting key={e.id} event={e} onClick={() => onSelectEvent(e.id)} />
                    ))}
                  </HourDropZone>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <DragOverlay>{active ? <MeetingCard event={active} /> : null}</DragOverlay>
    </DndContext>
  );
}
