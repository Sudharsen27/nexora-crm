import { apiFetch } from "@/lib/api/client";
import type { Activity, ActivityFilters, ActivityListResponse } from "@/types/api";

export type ActivityInput = {
  entity_type: string;
  entity_id: string;
  activity_type: string;
  description: string;
  metadata?: Record<string, unknown> | null;
};

export const ACTIVITY_TYPES = [
  "call",
  "meeting",
  "email",
  "note",
  "task_update",
  "lead_update",
  "deal_update",
] as const;

export const ENTITY_TYPES = ["lead", "contact", "deal", "company"] as const;

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  call: "Call",
  meeting: "Meeting",
  email: "Email",
  note: "Note",
  task_update: "Task Update",
  lead_update: "Lead Update",
  deal_update: "Deal Update",
};

export const ACTIVITY_TYPE_ICONS: Record<string, string> = {
  call: "📞",
  meeting: "📅",
  email: "📧",
  note: "📝",
  task_update: "✅",
  lead_update: "🎯",
  deal_update: "🤝",
};

function buildQuery(filters: ActivityFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.entity_type) params.set("entity_type", filters.entity_type);
  if (filters.entity_id) params.set("entity_id", filters.entity_id);
  if (filters.activity_type) params.set("activity_type", filters.activity_type);
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
  const params = buildQuery(filters);
  return apiFetch<ActivityListResponse>(
    `/tenants/${slug}/activities/lead/${leadId}${params}`,
  );
}

export async function listContactActivities(
  slug: string,
  contactId: string,
  filters: Omit<ActivityFilters, "entity_type" | "entity_id"> = {},
): Promise<ActivityListResponse> {
  const params = buildQuery(filters);
  return apiFetch<ActivityListResponse>(
    `/tenants/${slug}/activities/contact/${contactId}${params}`,
  );
}

export async function listDealActivities(
  slug: string,
  dealId: string,
  filters: Omit<ActivityFilters, "entity_type" | "entity_id"> = {},
): Promise<ActivityListResponse> {
  const params = buildQuery(filters);
  return apiFetch<ActivityListResponse>(
    `/tenants/${slug}/activities/deal/${dealId}${params}`,
  );
}

export async function listCompanyActivities(
  slug: string,
  companyId: string,
  filters: Omit<ActivityFilters, "entity_type" | "entity_id"> = {},
): Promise<ActivityListResponse> {
  const params = buildQuery(filters);
  return apiFetch<ActivityListResponse>(
    `/tenants/${slug}/activities/company/${companyId}${params}`,
  );
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

export async function deleteActivity(slug: string, activityId: string): Promise<void> {
  await apiFetch<void>(`/tenants/${slug}/activities/${activityId}`, { method: "DELETE" });
}

export function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getActivityTitle(activity: Activity): string {
  const label = ACTIVITY_TYPE_LABELS[activity.activity_type] ?? activity.activity_type;
  if (activity.activity_type === "call") return "Call Completed";
  if (activity.activity_type === "email") return "Email Sent";
  if (activity.activity_type === "meeting") return "Meeting Scheduled";
  if (activity.activity_type === "note") return "Note Added";
  return label;
}
