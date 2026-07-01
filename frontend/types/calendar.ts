export const MEETING_TYPES = [
  "call",
  "online_meeting",
  "client_meeting",
  "demo",
  "sales_meeting",
  "follow_up",
  "internal_meeting",
  "presentation",
  "interview",
  "support",
] as const;

export const MEETING_STATUSES = [
  "scheduled",
  "confirmed",
  "in_progress",
  "completed",
  "cancelled",
  "missed",
] as const;

export const MEETING_PRIORITIES = ["low", "medium", "high", "urgent"] as const;

export type MeetingType = (typeof MEETING_TYPES)[number];
export type MeetingStatus = (typeof MEETING_STATUSES)[number];
export type MeetingPriority = (typeof MEETING_PRIORITIES)[number];
export type CalendarView = "month" | "week" | "day" | "agenda" | "timeline";

export interface UserSummary {
  id: string;
  full_name: string;
  email: string;
}

export interface MeetingParticipant {
  id: string;
  user_id: string;
  role: string;
  attendance_status: string;
  user?: UserSummary | null;
}

export interface MeetingReminder {
  id: string;
  remind_before_minutes: number;
  method: string;
}

export interface Meeting {
  id: string;
  tenant_id: string;
  title: string;
  description?: string | null;
  agenda?: string | null;
  notes?: string | null;
  outcome?: string | null;
  meeting_type: MeetingType;
  status: MeetingStatus;
  priority: MeetingPriority;
  start_datetime: string;
  end_datetime: string;
  timezone: string;
  location?: string | null;
  meeting_url?: string | null;
  company_id?: string | null;
  contact_id?: string | null;
  lead_id?: string | null;
  deal_id?: string | null;
  task_id?: string | null;
  organizer_id?: string | null;
  organizer?: UserSummary | null;
  created_by_id?: string | null;
  created_by?: UserSummary | null;
  updated_by_id?: string | null;
  recurrence_rule?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  activity_id?: string | null;
  participants: MeetingParticipant[];
  reminders: MeetingReminder[];
  created_at: string;
  updated_at: string;
}

export interface MeetingListResponse {
  items: Meeting[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  meeting_type: MeetingType;
  status: MeetingStatus;
  priority: MeetingPriority;
  start_datetime: string;
  end_datetime: string;
  location?: string | null;
  meeting_url?: string | null;
  company_id?: string | null;
  contact_id?: string | null;
  lead_id?: string | null;
  deal_id?: string | null;
  organizer?: UserSummary | null;
  participant_count: number;
}

export interface CalendarResponse {
  items: CalendarEvent[];
  start: string;
  end: string;
}

export interface MeetingStatistics {
  meetings_today: number;
  meetings_this_week: number;
  meetings_this_month: number;
  completed_meetings: number;
  cancelled_meetings: number;
  upcoming_meetings: number;
  overdue_meetings: number;
  upcoming_calls: number;
  upcoming_demos: number;
}

export interface MeetingInput {
  title: string;
  description?: string | null;
  agenda?: string | null;
  notes?: string | null;
  meeting_type?: MeetingType;
  status?: MeetingStatus;
  priority?: MeetingPriority;
  start_datetime: string;
  end_datetime: string;
  timezone?: string;
  location?: string | null;
  meeting_url?: string | null;
  company_id?: string | null;
  contact_id?: string | null;
  lead_id?: string | null;
  deal_id?: string | null;
  task_id?: string | null;
  organizer_id?: string | null;
  participants?: { user_id: string; role?: string; attendance_status?: string }[];
  reminders?: { remind_before_minutes: number; method?: string }[];
}

export interface MeetingFilters {
  q?: string;
  meeting_type?: string;
  status?: string;
  priority?: string;
  company_id?: string;
  contact_id?: string;
  lead_id?: string;
  deal_id?: string;
  organizer_id?: string;
  participant_id?: string;
  start_from?: string;
  start_to?: string;
  page?: number;
  page_size?: number;
}
