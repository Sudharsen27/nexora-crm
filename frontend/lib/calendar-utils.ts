import type { CalendarEvent } from "@/types/calendar";

export function parseDate(iso: string): Date {
  return new Date(iso);
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatMeetingTime(start: string, end: string): string {
  const s = parseDate(start);
  const e = parseDate(end);
  return `${formatTime(s)} – ${formatTime(e)}`;
}

export function formatMeetingDate(date: string): string {
  return parseDate(date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function endOfWeek(date: Date): Date {
  return addDays(startOfWeek(date), 6);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function eachDayOfInterval(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  let cur = startOfDay(start);
  const last = startOfDay(end);
  while (cur <= last) {
    days.push(new Date(cur));
    cur = addDays(cur, 1);
  }
  return days;
}

export function getMonthGrid(anchor: Date): Date[] {
  const start = startOfWeek(startOfMonth(anchor));
  const end = endOfWeek(endOfMonth(anchor));
  return eachDayOfInterval(start, end);
}

export function getWeekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return eachDayOfInterval(start, addDays(start, 6));
}

export function isSameDay(a: Date, b: Date): boolean {
  return formatDayKey(a) === formatDayKey(b);
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function eventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((e) => isSameDay(parseDate(e.start_datetime), day));
}

export function groupEventsByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = formatDayKey(parseDate(event.start_datetime));
    const list = map.get(key) ?? [];
    list.push(event);
    map.set(key, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.start_datetime.localeCompare(b.start_datetime));
  }
  return map;
}

export function getCalendarRange(view: string, anchor: Date): { start: Date; end: Date } {
  if (view === "day") {
    const start = startOfDay(anchor);
    return { start, end: addDays(start, 1) };
  }
  if (view === "week" || view === "timeline") {
    const start = startOfWeek(anchor);
    return { start, end: addDays(start, 7) };
  }
  if (view === "agenda") {
    const start = startOfDay(anchor);
    return { start, end: addDays(start, 30) };
  }
  const start = startOfWeek(startOfMonth(anchor));
  const end = addDays(endOfWeek(endOfMonth(anchor)), 1);
  return { start, end };
}

export function shiftAnchor(view: string, anchor: Date, direction: -1 | 1): Date {
  if (view === "day") return addDays(anchor, direction);
  if (view === "week" || view === "timeline") return addDays(anchor, direction * 7);
  return addMonths(anchor, direction);
}

export function isCurrentMonth(day: Date, anchor: Date): boolean {
  return isSameMonth(day, anchor);
}

export const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function eventTopPercent(start: string): number {
  const d = parseDate(start);
  return ((d.getHours() * 60 + d.getMinutes()) / (24 * 60)) * 100;
}

export function eventHeightPercent(start: string, end: string): number {
  const s = parseDate(start);
  const e = parseDate(end);
  const mins = Math.max(30, (e.getTime() - s.getTime()) / 60000);
  return (mins / (24 * 60)) * 100;
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function formatWeekRange(anchor: Date): string {
  const start = startOfWeek(anchor);
  const end = addDays(start, 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, { ...opts, year: "numeric" })}`;
}
