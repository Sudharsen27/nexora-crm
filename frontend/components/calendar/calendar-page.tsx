"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarAgendaView } from "@/components/calendar/calendar-agenda-view";
import { CalendarDayView } from "@/components/calendar/calendar-day-view";
import { CalendarMonthView } from "@/components/calendar/calendar-month-view";
import { CalendarSidebar } from "@/components/calendar/calendar-sidebar";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { CalendarWeekView } from "@/components/calendar/calendar-week-view";
import { MeetingDrawer } from "@/components/calendar/meeting-drawer";
import { MeetingFormDialog } from "@/components/calendar/meeting-form-dialog";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { usePermissions } from "@/contexts/permissions-context";
import { useCalendar } from "@/hooks/use-calendar";
import {
  createMeeting,
  getUpcomingMeetings,
  rescheduleMeeting,
  updateMeeting,
} from "@/lib/api/meetings";
import { listMembers } from "@/lib/api/tenants";
import type { MeetingInput } from "@/types/calendar";
import type { CalendarView, Meeting } from "@/types/calendar";
import type { Member } from "@/types/api";

interface CalendarPageProps {
  tenantSlug: string;
}

export function CalendarPage({ tenantSlug }: CalendarPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canRead, canWrite } = usePermissions();

  const [anchor, setAnchor] = useState(() => {
    const dateParam = searchParams.get("date");
    return dateParam ? new Date(dateParam) : new Date();
  });
  const [view, setView] = useState<CalendarView>((searchParams.get("view") as CalendarView) || "month");
  const [meetingTypeFilter, setMeetingTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("meeting"));
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);

  const filters = useMemo(
    () => ({
      meeting_type: meetingTypeFilter || undefined,
      status: statusFilter || undefined,
    }),
    [meetingTypeFilter, statusFilter],
  );

  const { events, statistics, loading, error, refresh } = useCalendar(tenantSlug, view, anchor, filters);

  useEffect(() => {
    if (!canRead("meeting")) return;
    listMembers(tenantSlug).then(setMembers).catch(() => setMembers([]));
    getUpcomingMeetings(tenantSlug, 8).then((r) => setUpcoming(r.items)).catch(() => setUpcoming([]));
  }, [tenantSlug, canRead]);

  const openMeeting = useCallback(
    (id: string) => {
      setSelectedId(id);
      const params = new URLSearchParams(searchParams.toString());
      params.set("meeting", id);
      router.replace(`/${tenantSlug}/calendar?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, tenantSlug],
  );

  const closeDrawer = useCallback(() => {
    setSelectedId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("meeting");
    router.replace(`/${tenantSlug}/calendar?${params.toString()}`, { scroll: false });
  }, [router, searchParams, tenantSlug]);

  const handleSave = async (data: MeetingInput) => {
    if (editing) {
      await updateMeeting(tenantSlug, editing.id, data);
    } else {
      await createMeeting(tenantSlug, data);
    }
    setEditing(null);
    await refresh();
    const up = await getUpcomingMeetings(tenantSlug, 8);
    setUpcoming(up.items);
  };

  const handleReschedule = async (eventId: string, newStart: Date, newEnd: Date) => {
    await rescheduleMeeting(tenantSlug, eventId, {
      start_datetime: newStart.toISOString(),
      end_datetime: newEnd.toISOString(),
    });
    await refresh();
  };

  if (!canRead("meeting")) {
    return <p className="text-[var(--muted-foreground)]">You do not have permission to view the calendar.</p>;
  }

  return (
    <div className="space-y-4">
      <CalendarToolbar
        view={view}
        anchor={anchor}
        onViewChange={setView}
        onAnchorChange={setAnchor}
        onToday={() => setAnchor(new Date())}
        onCreate={() => { setEditing(null); setFormOpen(true); }}
        canCreate={canWrite("meeting")}
      />

      <div className="grid gap-4 xl:grid-cols-[260px_1fr]">
        <CalendarSidebar
          tenantSlug={tenantSlug}
          anchor={anchor}
          statistics={statistics}
          upcoming={upcoming}
          meetingTypeFilter={meetingTypeFilter}
          statusFilter={statusFilter}
          onAnchorChange={setAnchor}
          onMeetingTypeFilter={setMeetingTypeFilter}
          onStatusFilter={setStatusFilter}
          onCreate={() => { setEditing(null); setFormOpen(true); }}
          onSelectEvent={openMeeting}
          canCreate={canWrite("meeting")}
        />

        <div>
          {loading ? (
            <WidgetSkeleton variant="calendar" />
          ) : error ? (
            <WidgetError title="Calendar unavailable" message={error} onRetry={() => void refresh()} />
          ) : view === "month" ? (
            <CalendarMonthView
              anchor={anchor}
              events={events}
              onSelectDay={(day) => { setAnchor(day); setView("day"); }}
              onSelectEvent={openMeeting}
            />
          ) : view === "week" || view === "timeline" ? (
            <CalendarWeekView
              anchor={anchor}
              events={events}
              onSelectEvent={openMeeting}
              onReschedule={handleReschedule}
            />
          ) : view === "day" ? (
            <CalendarDayView anchor={anchor} events={events} onSelectEvent={openMeeting} />
          ) : (
            <CalendarAgendaView events={events} onSelectEvent={openMeeting} />
          )}
        </div>
      </div>

      <MeetingFormDialog
        open={formOpen}
        tenantSlug={tenantSlug}
        members={members}
        initial={editing}
        defaultStart={anchor}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSubmit={handleSave}
      />

      <MeetingDrawer
        tenantSlug={tenantSlug}
        meetingId={selectedId}
        onClose={closeDrawer}
        onEdit={(m) => { setEditing(m); setFormOpen(true); closeDrawer(); }}
        onChanged={() => void refresh()}
      />
    </div>
  );
}
