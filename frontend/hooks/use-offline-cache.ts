"use client";

import { useCallback, useEffect, useState } from "react";
import { getCachedByResource } from "@/lib/offline/indexed-db";
import { useOnlineStatus } from "@/hooks/use-online-status";
import type { CachedEntity, CacheResource } from "@/types/mobile";

export function useOfflineCache<T extends Record<string, unknown>>(
  resource: CacheResource,
  onlineFetcher?: () => Promise<T[]>,
) {
  const online = useOnlineStatus();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (online && onlineFetcher) {
        const data = await onlineFetcher();
        setItems(data);
        setFromCache(false);
      } else {
        const cached = await getCachedByResource(resource);
        setItems(cached.map((c: CachedEntity) => c.data as T));
        setFromCache(true);
      }
    } catch {
      const cached = await getCachedByResource(resource);
      setItems(cached.map((c: CachedEntity) => c.data as T));
      setFromCache(true);
    } finally {
      setLoading(false);
    }
  }, [online, onlineFetcher, resource]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, fromCache, online, refresh };
}
