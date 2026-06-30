"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { listActivities } from "@/lib/api/activities";
import type { Activity, ActivityFilters } from "@/types/api";

export function useActivities(tenantSlug: string, filters: ActivityFilters = {}) {
  const [items, setItems] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const filterKey = JSON.stringify(filters);

  const load = useCallback(
    async (append = false, cursorValue?: string | null) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const data = await listActivities(tenantSlug, {
          ...filters,
          cursor: cursorValue ?? undefined,
          page_size: filters.page_size ?? 20,
        });
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setTotal(data.total);
        setCursor(data.next_cursor);
        setHasMore(data.has_more);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load activities");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [tenantSlug, filterKey],
  );

  useEffect(() => {
    setCursor(null);
    void load(false);
  }, [load]);

  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore || !cursor) return;
    void load(true, cursor);
  }, [hasMore, loadingMore, cursor, load]);

  const refresh = useCallback(() => load(false), [load]);

  const prepend = useCallback((activity: Activity) => {
    setItems((prev) => [activity, ...prev]);
    setTotal((t) => t + 1);
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((a) => a.id !== id));
    setTotal((t) => Math.max(0, t - 1));
  }, []);

  return {
    items,
    total,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
    prepend,
    remove,
  };
}

export function useActivityPoll(
  tenantSlug: string,
  onNewActivities: (activities: Activity[]) => void,
  intervalMs = 30000,
  enabled = true,
) {
  const lastSeen = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const tick = async () => {
      try {
        const data = await listActivities(tenantSlug, { page_size: 5, sort: "desc" });
        if (!data.items.length) return;
        const newest = data.items[0].created_at;
        if (lastSeen.current && newest > lastSeen.current) {
          const fresh = data.items.filter((a) => a.created_at > lastSeen.current!);
          if (fresh.length) onNewActivities(fresh.reverse());
        }
        lastSeen.current = newest;
      } catch {
        /* silent */
      }
    };
    void tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [tenantSlug, intervalMs, enabled, onNewActivities]);
}
