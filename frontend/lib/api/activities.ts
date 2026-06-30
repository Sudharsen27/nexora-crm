import { apiFetch } from "@/lib/api/client";
import type { Activity, ActivityFilters, ActivityListResponse } from "@/types/api";

export type ActivityInput = {
  entity_type: string;
  entity_id: string;
  activity_type: string;
  description: string;
  title?: string | null;
  action?: string | null;
  metadata?: Record<string, unknown> | null;
  scheduled_at?: string | null;
};

export const ACTIVITY_CATEGORIES = [
  { value: "", label: "All" },
  { value: "deals", label: "Deals" },
  { value: "companies", label: "Companies" },
  { value: "contacts", label: "Contacts" },
  { value: "tasks", label: "Tasks" },
  { value: "notes", label: "Notes" },
  { value: "authentication", label: "Authentication" },
] as const;

export const ACTIVITY_TYPES = [
  "call", "meeting", "email", "note",
  "company_created", "company_updated", "company_deleted",
  "contact_created", "contact_updated", "contact_deleted",
  "lead_created", "lead_updated", "lead_assigned", "lead_converted", "lead_deleted",
  "deal_created", "deal_updated", "deal_stage_changed", "deal_moved", "deal_won", "deal_lost", "deal_deleted",
  "task_created", "task_updated", "task_completed", "task_reopened", "task_deleted",
  "note_added", "note_edited",
  "user_login", "user_invited", "password_reset",
] as const;

export const ENTITY_TYPES = ["lead", "contact", "deal", "company", "task", "user", "tenant"] as const;

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  call: "Call", meeting: "Meeting", email: "Email", note: "Note",
  company_created: "Company Created", company_updated: "Company Updated", company_deleted: "Company Deleted",
  contact_created: "Contact Created", contact_updated: "Contact Updated", contact_deleted: "Contact Deleted",
  lead_created: "Lead Created", lead_updated: "Lead Updated", lead_assigned: "Lead Assigned",
  lead_converted: "Lead Converted", lead_deleted: "Lead Deleted",
  deal_created: "Deal Created", deal_updated: "Deal Updated", deal_stage_changed: "Stage Changed",
  deal_moved: "Deal Moved", deal_won: "Deal Won", deal_lost: "Deal Lost", deal_deleted: "Deal Deleted",
  task_created: "Task Created", task_updated: "Task Updated", task_completed: "Task Completed",
  task_reopened: "Task Reopened", task_deleted: "Task Deleted",
  note_added: "Note Added", note_edited: "Note Edited",
  user_login: "Login", user_invited: "User Invited", password_reset: "Password Reset",
};

function buildQuery(filters: ActivityFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.entity_type) params.set("entity_type", filters.entity_type);
  if (filters.entity_id) params.set("entity_id", filters.entity_id);
  if (filters.activity_type) params.set("activity_type", filters.activity_type);
  if (filters.action) params.set("action", filters.action);
  if (filters.actor_id) params.set("actor_id", filters.actor_id);
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  if (filters.category) params.set("category", filters.category);
  if (filters.cursor) params.set("cursor", filters.cursor);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.page_size) params.set("page_size", String(filters.page_size));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function listActivities(
  slug: string,
  filters: ActivityFilters = {},
): Promise<ActivityListResponse> {
  return apiFetch<ActivityListResponse>(`/tenants/${slug}/activities${buildQuery(filters)}`);
}

export async function listLeadActivities(
  slug: string,
  leadId: string,
  filters: Omit<ActivityFilters, "entity_type" | "entity_id"> = {},
): Promise<ActivityListResponse> {
  return apiFetch<ActivityListResponse>(`/tenants/${slug}/activities/lead/${leadId}${buildQuery(filters)}`);
}

export async function listContactActivities(
  slug: string,
  contactId: string,
  filters: Omit<ActivityFilters, "entity_type" | "entity_id"> = {},
): Promise<ActivityListResponse> {
  return apiFetch<ActivityListResponse>(`/tenants/${slug}/activities/contact/${contactId}${buildQuery(filters)}`);
}

export async function listDealActivities(
  slug: string,
  dealId: string,
  filters: Omit<ActivityFilters, "entity_type" | "entity_id"> = {},
): Promise<ActivityListResponse> {
  return apiFetch<ActivityListResponse>(`/tenants/${slug}/activities/deal/${dealId}${buildQuery(filters)}`);
}

export async function listCompanyActivities(
  slug: string,
  companyId: string,
  filters: Omit<ActivityFilters, "entity_type" | "entity_id"> = {},
): Promise<ActivityListResponse> {
  return apiFetch<ActivityListResponse>(`/tenants/${slug}/activities/company/${companyId}${buildQuery(filters)}`);
}

export async function getActivity(slug: string, activityId: string): Promise<Activity> {
  return apiFetch<Activity>(`/tenants/${slug}/activities/${activityId}`);
}

export async function createActivity(slug: string, data: ActivityInput): Promise<Activity> {
  return apiFetch<Activity>(`/tenants/${slug}/activities`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateActivity(
  slug: string,
  activityId: string,
  data: Partial<ActivityInput>,
): Promise<Activity> {
  return apiFetch<Activity>(`/tenants/${slug}/activities/${activityId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteActivity(slug: string, activityId: string): Promise<void> {
  await apiFetch<void>(`/tenants/${slug}/activities/${activityId}`, { method: "DELETE" });
}

export async function bulkDeleteActivities(slug: string, ids: string[]): Promise<{ affected: number }> {
  return apiFetch<{ affected: number }>(`/tenants/${slug}/activities/bulk-delete`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export async function bulkArchiveActivities(slug: string, ids: string[]): Promise<{ affected: number }> {
  return apiFetch<{ affected: number }>(`/tenants/${slug}/activities/bulk-archive`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getActivityTitle(activity: Activity): string {
  return activity.title || ACTIVITY_TYPE_LABELS[activity.action] || activity.action.replace(/_/g, " ");
}

// Legacy emoji map for embedded timelines
export const ACTIVITY_TYPE_ICONS: Record<string, string> = {
  call: "📞", meeting: "📅", email: "📧", note: "📝",
  deal_created: "✨", deal_moved: "↔️", deal_updated: "✏️",
  deal_deleted: "🗑️", deal_won: "🏆", deal_lost: "❌",
};
