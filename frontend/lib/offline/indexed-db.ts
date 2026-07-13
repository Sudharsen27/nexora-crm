import type { CachedEntity, CacheResource, StorageStats } from "@/types/mobile";

const DB_NAME = "nexora-offline";
const DB_VERSION = 1;

const STORES = {
  cache: "cache",
  queue: "queue",
  meta: "meta",
  auth: "auth",
} as const;

type StoreName = (typeof STORES)[keyof typeof STORES];

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORES.cache)) {
        const cache = db.createObjectStore(STORES.cache, { keyPath: "id" });
        cache.createIndex("resource", "resource", { unique: false });
        cache.createIndex("updated_at", "updated_at", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.queue)) {
        const queue = db.createObjectStore(STORES.queue, { keyPath: "client_id" });
        queue.createIndex("status", "status", { unique: false });
        queue.createIndex("created_at", "created_at", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.meta)) {
        db.createObjectStore(STORES.meta, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORES.auth)) {
        db.createObjectStore(STORES.auth, { keyPath: "key" });
      }
    };
  });
}

async function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    Promise.resolve(fn(store))
      .then((result) => {
        if (result instanceof IDBRequest) {
          result.onsuccess = () => resolve(result.result as T);
          result.onerror = () => reject(result.error);
        } else {
          resolve(result);
        }
      })
      .catch(reject);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

export async function cacheEntities(
  resource: CacheResource,
  items: Record<string, unknown>[],
): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORES.cache, "readwrite");
  const store = tx.objectStore(STORES.cache);
  const now = new Date().toISOString();

  for (const item of items) {
    const id = String(item.id ?? crypto.randomUUID());
    const entity: CachedEntity = {
      id: `${resource}:${id}`,
      resource,
      data: item,
      updated_at: String(item.updated_at ?? item.created_at ?? now),
      synced_at: now,
    };
    store.put(entity);
  }

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    db.close();
  });
}

export async function getCachedByResource(resource: CacheResource): Promise<CachedEntity[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.cache, "readonly");
    const store = tx.objectStore(STORES.cache);
    const index = store.index("resource");
    const request = index.getAll(resource);
    request.onsuccess = () => resolve(request.result as CachedEntity[]);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function getCachedEntity(resource: CacheResource, entityId: string): Promise<CachedEntity | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.cache, "readonly");
    const store = tx.objectStore(STORES.cache);
    const request = store.get(`${resource}:${entityId}`);
    request.onsuccess = () => resolve((request.result as CachedEntity) ?? null);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function clearCache(resource?: CacheResource): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORES.cache, "readwrite");
  const store = tx.objectStore(STORES.cache);

  if (!resource) {
    store.clear();
  } else {
    const index = store.index("resource");
    const request = index.getAllKeys(resource);
    await new Promise<void>((resolve, reject) => {
      request.onsuccess = () => {
        const keys = request.result as IDBValidKey[];
        keys.forEach((key) => store.delete(key));
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    db.close();
  });
}

export async function enqueueLocalChange(item: {
  client_id: string;
  resource: string;
  action: string;
  entity_id?: string | null;
  payload: Record<string, unknown>;
}): Promise<void> {
  await withStore(STORES.queue, "readwrite", (store) =>
    store.put({
      ...item,
      status: "pending",
      created_at: new Date().toISOString(),
    }),
  );
}

export async function getPendingQueue(): Promise<
  Array<{
    client_id: string;
    resource: string;
    action: string;
    entity_id?: string | null;
    payload: Record<string, unknown>;
    status: string;
    created_at: string;
  }>
> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.queue, "readonly");
    const store = tx.objectStore(STORES.queue);
    const request = store.getAll();
    request.onsuccess = () => {
      const items = (request.result as Array<{ status: string }>).filter((i) => i.status === "pending");
      resolve(items as never);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function markQueueItemSynced(clientId: string): Promise<void> {
  await withStore(STORES.queue, "readwrite", (store) => store.delete(clientId));
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await withStore(STORES.meta, "readwrite", (store) => store.put({ key, value, updated_at: new Date().toISOString() }));
}

export async function getMeta<T>(key: string): Promise<T | null> {
  const result = await withStore<{ key: string; value: T } | undefined>(STORES.meta, "readonly", (store) =>
    store.get(key),
  );
  return result?.value ?? null;
}

export async function setOfflineAuth(profile: Record<string, unknown>): Promise<void> {
  await withStore(STORES.auth, "readwrite", (store) =>
    store.put({ key: "profile", value: profile, saved_at: new Date().toISOString() }),
  );
}

export async function getOfflineAuth(): Promise<Record<string, unknown> | null> {
  const result = await withStore<{ value: Record<string, unknown> } | undefined>(STORES.auth, "readonly", (store) =>
    store.get("profile"),
  );
  return result?.value ?? null;
}

export async function getStorageStats(): Promise<StorageStats> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.cache, "readonly");
    const store = tx.objectStore(STORES.cache);
    const request = store.getAll();
    request.onsuccess = () => {
      const items = request.result as CachedEntity[];
      const resources: Record<string, number> = {};
      let usedBytes = 0;
      for (const item of items) {
        resources[item.resource] = (resources[item.resource] ?? 0) + 1;
        usedBytes += JSON.stringify(item).length;
      }
      resolve({ usedBytes, itemCount: items.length, resources });
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function estimateStorageUsage(): Promise<number> {
  if (navigator.storage?.estimate) {
    const estimate = await navigator.storage.estimate();
    return estimate.usage ?? 0;
  }
  const stats = await getStorageStats();
  return stats.usedBytes;
}
