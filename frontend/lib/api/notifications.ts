import { apiFetch } from "@/lib/api/client";
import type { Notification, NotificationFilters, NotificationListResponse } from "@/types/notification";

function buildQuery(filters: NotificationFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category && filters.category !== "all") params.set("category", filters.category);
  if (filters.unread_only) params.set("unread_only", "true");
  if (filters.cursor) params.set("cursor", filters.cursor);
  if (filters.page_size) params.set("page_size", String(filters.page_size));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function listNotifications(
  slug: string,
  filters: NotificationFilters = {},
): Promise<NotificationListResponse> {
  return apiFetch<NotificationListResponse>(`/tenants/${slug}/notifications${buildQuery(filters)}`);
}

export async function getUnreadCount(slug: string): Promise<{ unread_count: number }> {
  return apiFetch<{ unread_count: number }>(`/tenants/${slug}/notifications/unread-count`);
}

export async function markNotificationRead(slug: string, id: string): Promise<Notification> {
  return apiFetch<Notification>(`/tenants/${slug}/notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead(slug: string): Promise<{ affected: number }> {
  return apiFetch<{ affected: number }>(`/tenants/${slug}/notifications/mark-all-read`, { method: "POST" });
}

export async function deleteNotification(slug: string, id: string): Promise<void> {
  await apiFetch<void>(`/tenants/${slug}/notifications/${id}`, { method: "DELETE" });
}

export async function archiveNotification(slug: string, id: string): Promise<Notification> {
  return apiFetch<Notification>(`/tenants/${slug}/notifications/${id}/archive`, { method: "POST" });
}

export async function bulkDeleteNotifications(slug: string, ids: string[]): Promise<{ affected: number }> {
  return apiFetch<{ affected: number }>(`/tenants/${slug}/notifications/bulk-delete`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export async function bulkArchiveNotifications(slug: string, ids: string[]): Promise<{ affected: number }> {
  return apiFetch<{ affected: number }>(`/tenants/${slug}/notifications/bulk-archive`, {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

export function getNotificationsWsUrl(slug: string, token: string): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
  const wsBase = apiUrl.replace(/^http/, "ws");
  return `${wsBase}/tenants/${slug}/notifications/ws?token=${encodeURIComponent(token)}`;
}
