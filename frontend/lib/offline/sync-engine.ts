import {
  cacheEntities,
  clearCache,
  enqueueLocalChange,
  getMeta,
  getPendingQueue,
  getStorageStats,
  markQueueItemSynced,
  setMeta,
} from "@/lib/offline/indexed-db";
import { enqueueOfflineChanges, processOfflineQueue, syncNow } from "@/lib/api/mobile";
import type { CacheResource } from "@/types/mobile";

const LAST_SYNC_KEY = "last_sync_at";

export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

export async function runFullSync(tenantSlug: string, resources?: CacheResource[]): Promise<{
  downloaded: number;
  uploaded: number;
  failed: number;
}> {
  if (!isOnline()) {
    throw new Error("Cannot sync while offline");
  }

  const pending = await getPendingQueue();
  if (pending.length > 0) {
    await enqueueOfflineChanges(
      tenantSlug,
      pending.map((item) => ({
        client_id: item.client_id,
        resource: item.resource,
        action: item.action,
        entity_id: item.entity_id,
        payload: item.payload,
      })),
    );
    const uploadResult = await processOfflineQueue(tenantSlug);
    for (const item of pending) {
      await markQueueItemSynced(item.client_id);
    }
    if (uploadResult.failed > 0) {
      return { downloaded: 0, uploaded: uploadResult.completed, failed: uploadResult.failed };
    }
  }

  const response = await syncNow(tenantSlug, resources);
  let downloaded = 0;

  for (const [resource, items] of Object.entries(response.data)) {
    if (items.length > 0) {
      await cacheEntities(resource as CacheResource, items);
      downloaded += items.length;
    }
  }

  await setMeta(LAST_SYNC_KEY, response.server_time);

  const stats = await getStorageStats();
  return {
    downloaded,
    uploaded: response.session.items_uploaded,
    failed: 0,
  };
}

export async function queueOfflineMutation(
  resource: string,
  action: string,
  payload: Record<string, unknown>,
  entityId?: string,
): Promise<string> {
  const clientId = crypto.randomUUID();
  await enqueueLocalChange({
    client_id: clientId,
    resource,
    action,
    entity_id: entityId ?? null,
    payload,
  });

  if (isOnline()) {
    try {
      const reg = await navigator.serviceWorker?.ready;
      const syncManager = (reg as ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } })?.sync;
      if (syncManager) {
        await syncManager.register("nexora-offline-sync");
      }
    } catch {
      // Background Sync API not supported — manual sync required
    }
  }

  return clientId;
}

export async function getLastSyncTime(): Promise<string | null> {
  return getMeta<string>(LAST_SYNC_KEY);
}

export async function downloadAllData(tenantSlug: string): Promise<number> {
  const response = await syncNow(tenantSlug);
  let count = 0;
  for (const [resource, items] of Object.entries(response.data)) {
    if (items.length > 0) {
      await cacheEntities(resource as CacheResource, items);
      count += items.length;
    }
  }
  await setMeta(LAST_SYNC_KEY, response.server_time);
  return count;
}

export async function clearAllOfflineData(resource?: CacheResource): Promise<void> {
  await clearCache(resource);
  if (!resource) {
    await setMeta(LAST_SYNC_KEY, null);
  }
}

export function registerOnlineHandlers(onOnline: () => void, onOffline: () => void): () => void {
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}
