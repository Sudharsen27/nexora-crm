import { apiFetch } from "@/lib/api/client";
import type {
  MobileDashboard,
  MobileSettings,
  OfflineQueueItem,
  OfflineQueueItemResponse,
  PushSubscriptionInfo,
  SyncConflict,
  SyncDataResponse,
  SyncSession,
} from "@/types/mobile";

export function getMobileDashboard(tenantSlug: string) {
  return apiFetch<MobileDashboard>(`/tenants/${tenantSlug}/mobile/dashboard`);
}

export function getMobileSettings(tenantSlug: string) {
  return apiFetch<MobileSettings>(`/tenants/${tenantSlug}/mobile/settings`);
}

export function updateMobileSettings(tenantSlug: string, payload: Partial<MobileSettings>) {
  return apiFetch<MobileSettings>(`/tenants/${tenantSlug}/mobile/settings`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function enqueueOfflineChanges(tenantSlug: string, items: OfflineQueueItem[]) {
  return apiFetch<{ accepted: number; items: OfflineQueueItemResponse[] }>(
    `/tenants/${tenantSlug}/mobile/offline-queue`,
    { method: "POST", body: JSON.stringify({ items }) },
  );
}

export function processOfflineQueue(tenantSlug: string) {
  return apiFetch<{ completed: number; failed: number; processed: number }>(
    `/tenants/${tenantSlug}/mobile/offline-queue/process`,
    { method: "POST" },
  );
}

export function syncNow(tenantSlug: string, resources?: string[], since?: string) {
  return apiFetch<SyncDataResponse>(`/tenants/${tenantSlug}/mobile/sync`, {
    method: "POST",
    body: JSON.stringify({ resources: resources ?? [], since: since ?? null }),
  });
}

export function getSyncHistory(tenantSlug: string) {
  return apiFetch<SyncSession[]>(`/tenants/${tenantSlug}/mobile/sync/history`);
}

export function getConflicts(tenantSlug: string) {
  return apiFetch<SyncConflict[]>(`/tenants/${tenantSlug}/mobile/conflicts`);
}

export function resolveConflict(
  tenantSlug: string,
  conflictId: string,
  resolution: string,
  mergedData?: Record<string, unknown>,
) {
  return apiFetch<SyncConflict>(`/tenants/${tenantSlug}/mobile/conflicts/${conflictId}/resolve`, {
    method: "POST",
    body: JSON.stringify({ resolution, merged_data: mergedData ?? null }),
  });
}

export function subscribePush(
  tenantSlug: string,
  subscription: PushSubscription,
  userAgent?: string,
) {
  const json = subscription.toJSON();
  const keys = json.keys ?? {};
  return apiFetch<PushSubscriptionInfo>(`/tenants/${tenantSlug}/mobile/push/subscribe`, {
    method: "POST",
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys,
      user_agent: userAgent,
      preferences: {
        deals: true,
        tasks: true,
        meetings: true,
        emails: true,
        workflows: true,
        ai: true,
        portal: true,
      },
    }),
  });
}

export function unsubscribePush(tenantSlug: string, subscriptionId: string) {
  return apiFetch<void>(`/tenants/${tenantSlug}/mobile/push/subscriptions/${subscriptionId}`, {
    method: "DELETE",
  });
}

export function listPushSubscriptions(tenantSlug: string) {
  return apiFetch<PushSubscriptionInfo[]>(`/tenants/${tenantSlug}/mobile/push/subscriptions`);
}
