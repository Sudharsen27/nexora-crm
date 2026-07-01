"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MeetingCard } from "@/components/calendar/meeting-card";
import { getMonthGrid, isSameDay } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";
import type { Meeting, MeetingStatistics } from "@/types/calendar";

interface CalendarSidebarProps {
  tenantSlug: string;
  anchor: Date;
  statistics: MeetingStatistics | null;
  upcoming: Meeting[];
  meetingTypeFilter: string;
  statusFilter: string;
  onAnchorChange: (date: Date) => void;
  onMeetingTypeFilter: (value: string) => void;
  onStatusFilter: (value: string) => void;
  onCreate: () => void;
  onSelectEvent: (id: string) => void;
  canCreate: boolean;
}

export function CalendarSidebar({
  tenantSlug,
  anchor,
  statistics,
  upcoming,
  meetingTypeFilter,
  statusFilter,
  onAnchorChange,
  onMeetingTypeFilter,
  onStatusFilter,
  onCreate,
  onSelectEvent,
  canCreate,
}: CalendarSidebarProps) {
  const miniDays = getMonthGrid(anchor);

  return (
    <aside className="space-y-4">
      {canCreate && (
        <Button className="w-full" size="sm" onClick={onCreate}>
          <Plus className="mr-1 h-4 w-4" /> Quick Create
        </Button>
      )}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-3 backdrop-blur">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Mini Calendar</p>
        <div className="grid grid-cols-7 gap-0.5 text-center text-[10px]">
          {miniDays.map((day) => (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onAnchorChange(day)}
              className={cn(
                "rounded p-1 hover:bg-black/5",
                isSameDay(day, new Date()) && "bg-[var(--primary)] text-white",
              )}
            >
              {day.getDate()}
            </button>
          ))}
        </div>
      </div>
      {statistics && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-3 backdrop-blur text-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Summary</p>
          <dl className="space-y-1">
            <div className="flex justify-between"><dt>Today</dt><dd className="font-medium">{statistics.meetings_today}</dd></div>
            <div className="flex justify-between"><dt>This week</dt><dd className="font-medium">{statistics.meetings_this_week}</dd></div>
            <div className="flex justify-between"><dt>Upcoming</dt><dd className="font-medium">{statistics.upcoming_meetings}</dd></div>
            <div className="flex justify-between"><dt>Overdue</dt><dd className="font-medium text-amber-600">{statistics.overdue_meetings}</dd></div>
          </dl>
        </div>
      )}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-3 backdrop-blur">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Filters</p>
        <div className="space-y-2">
          <select className="w-full rounded-lg border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm" value={meetingTypeFilter} onChange={(e) => onMeetingTypeFilter(e.target.value)}>
            <option value="">All types</option>
            <option value="call">Calls</option>
            <option value="demo">Demos</option>
            <option value="client_meeting">Client meetings</option>
            <option value="internal_meeting">Internal</option>
          </select>
          <select className="w-full rounded-lg border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm" value={statusFilter} onChange={(e) => onStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-3 backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Upcoming</p>
          <Link href={`/${tenantSlug}/calendar`} className="text-xs text-[var(--primary)]">View all</Link>
        </div>
        <div className="space-y-2">
          {upcoming.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No upcoming meetings</p>
          ) : (
            upcoming.slice(0, 5).map((e) => (
              <MeetingCard key={e.id} event={e} compact onClick={() => onSelectEvent(e.id)} />
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
