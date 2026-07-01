import { apiFetch } from "@/lib/api/client";
import {
  MEETING_PRIORITIES,
  MEETING_STATUSES,
  MEETING_TYPES,
  type CalendarResponse,
  type Meeting,
  type MeetingFilters,
  type MeetingInput,
  type MeetingListResponse,
  type MeetingStatistics,
} from "@/types/calendar";

export { MEETING_PRIORITIES, MEETING_STATUSES, MEETING_TYPES };
export type { MeetingInput };

export const MEETING_TYPE_LABELS: Record<string, string> = {
  call: "Call",
  online_meeting: "Online Meeting",
  client_meeting: "Client Meeting",
  demo: "Demo",
  sales_meeting: "Sales Meeting",
  follow_up: "Follow Up",
  internal_meeting: "Internal Meeting",
  presentation: "Presentation",
  interview: "Interview",
  support: "Support",
};

export const MEETING_STATUS_LABELS: Record<string, string> = {
  scheduled: "Scheduled",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
  missed: "Missed",
};

export const MEETING_TYPE_COLORS: Record<string, string> = {
  call: "bg-blue-500/15 text-blue-700 border-blue-500/30 dark:text-blue-300",
  online_meeting: "bg-violet-500/15 text-violet-700 border-violet-500/30 dark:text-violet-300",
  client_meeting: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  demo: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
  sales_meeting: "bg-rose-500/15 text-rose-700 border-rose-500/30 dark:text-rose-300",
  follow_up: "bg-cyan-500/15 text-cyan-700 border-cyan-500/30 dark:text-cyan-300",
  internal_meeting: "bg-zinc-500/15 text-zinc-700 border-zinc-500/30 dark:text-zinc-300",
  presentation: "bg-indigo-500/15 text-indigo-700 border-indigo-500/30 dark:text-indigo-300",
  interview: "bg-orange-500/15 text-orange-700 border-orange-500/30 dark:text-orange-300",
  support: "bg-teal-500/15 text-teal-700 border-teal-500/30 dark:text-teal-300",
};

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const q = search.toString();
  return q ? `?${q}` : "";
}

export function listMeetings(tenantSlug: string, filters: MeetingFilters = {}) {
  return apiFetch<MeetingListResponse>(
    `/tenants/${tenantSlug}/meetings${buildQuery(filters as Record<string, string | number | undefined>)}`
  );
}

export function getMeeting(tenantSlug: string, meetingId: string) {
  return apiFetch<Meeting>(`/tenants/${tenantSlug}/meetings/${meetingId}`);
}

export function createMeeting(tenantSlug: string, data: MeetingInput) {
  return apiFetch<Meeting>(`/tenants/${tenantSlug}/meetings`, { method: "POST", body: JSON.stringify(data) });
}

export function updateMeeting(tenantSlug: string, meetingId: string, data: Partial<MeetingInput>) {
  return apiFetch<Meeting>(`/tenants/${tenantSlug}/meetings/${meetingId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function rescheduleMeeting(
  tenantSlug: string,
  meetingId: string,
  data: { start_datetime: string; end_datetime: string; timezone?: string }
) {
  return apiFetch<Meeting>(`/tenants/${tenantSlug}/meetings/${meetingId}/reschedule`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function updateMeetingStatus(tenantSlug: string, meetingId: string, status: string) {
  return apiFetch<Meeting>(`/tenants/${tenantSlug}/meetings/${meetingId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function duplicateMeeting(tenantSlug: string, meetingId: string) {
  return apiFetch<Meeting>(`/tenants/${tenantSlug}/meetings/${meetingId}/duplicate`, { method: "POST" });
}

export function deleteMeeting(tenantSlug: string, meetingId: string) {
  return apiFetch<void>(`/tenants/${tenantSlug}/meetings/${meetingId}`, { method: "DELETE" });
}

export function getUpcomingMeetings(tenantSlug: string, limit = 10) {
  return apiFetch<MeetingListResponse>(`/tenants/${tenantSlug}/meetings/upcoming?limit=${limit}`);
}

export function getTodayMeetings(tenantSlug: string) {
  return apiFetch<MeetingListResponse>(`/tenants/${tenantSlug}/meetings/today`);
}

export function getMeetingStatistics(tenantSlug: string) {
  return apiFetch<MeetingStatistics>(`/tenants/${tenantSlug}/meetings/statistics`);
}

export function getCalendar(
  tenantSlug: string,
  params: { start: string; end: string; meeting_type?: string; status?: string; organizer_id?: string }
) {
  return apiFetch<CalendarResponse>(`/tenants/${tenantSlug}/calendar${buildQuery(params)}`);
}
