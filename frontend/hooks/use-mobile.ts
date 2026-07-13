"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getMobileDashboard,
  getMobileSettings,
  getSyncHistory,
  syncNow,
  updateMobileSettings,
} from "@/lib/api/mobile";
import { clearAllOfflineData, downloadAllData, runFullSync } from "@/lib/offline/sync-engine";
import { estimateStorageUsage, getStorageStats } from "@/lib/offline/indexed-db";
import type { CacheResource, MobileDashboard, MobileSettings, SyncSession } from "@/types/mobile";
import { useOnlineStatus } from "@/hooks/use-online-status";

export function useMobileDashboard(tenantSlug: string) {
  const online = useOnlineStatus();
  const [dashboard, setDashboard] = useState<MobileDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!online) {
      const stats = await getStorageStats();
      setDashboard({
        is_online: false,
        offline_queue_pending: 0,
        open_conflicts: 0,
        last_sync_at: null,
        storage_used_bytes: stats.usedBytes,
        push_subscriptions: 0,
        recent_sessions: [],
        cacheable_resources: [],
      });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getMobileDashboard(tenantSlug);
      setDashboard({ ...data, is_online: true });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load mobile dashboard");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, online]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { dashboard, loading, error, refresh, online };
}

export function useMobileSettings(tenantSlug: string) {
  const [settings, setSettings] = useState<MobileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMobileSettings(tenantSlug);
      setSettings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const update = useCallback(
    async (patch: Partial<MobileSettings>) => {
      const updated = await updateMobileSettings(tenantSlug, patch);
      setSettings(updated);
      return updated;
    },
    [tenantSlug],
  );

  return { settings, loading, error, refresh, update };
}

export function useOfflineSync(tenantSlug: string) {
  const online = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<{ downloaded: number; uploaded: number; failed: number } | null>(
    null,
  );
  const [history, setHistory] = useState<SyncSession[]>([]);

  const sync = useCallback(
    async (resources?: CacheResource[]) => {
      if (!online) throw new Error("Offline — sync when back online");
      setSyncing(true);
      try {
        const result = await runFullSync(tenantSlug, resources);
        setLastResult(result);
        const usage = await estimateStorageUsage();
        await updateMobileSettings(tenantSlug, { storage_used_bytes: usage });
        return result;
      } finally {
        setSyncing(false);
      }
    },
    [tenantSlug, online],
  );

  const download = useCallback(async () => {
    if (!online) throw new Error("Offline");
    setSyncing(true);
    try {
      const count = await downloadAllData(tenantSlug);
      const usage = await estimateStorageUsage();
      await updateMobileSettings(tenantSlug, { storage_used_bytes: usage });
      return count;
    } finally {
      setSyncing(false);
    }
  }, [tenantSlug, online]);

  const clearCache = useCallback(async (resource?: CacheResource) => {
    await clearAllOfflineData(resource);
    const usage = await estimateStorageUsage();
    await updateMobileSettings(tenantSlug, { storage_used_bytes: usage });
  }, [tenantSlug]);

  const loadHistory = useCallback(async () => {
    if (!online) return;
    try {
      const sessions = await getSyncHistory(tenantSlug);
      setHistory(sessions);
    } catch {
      setHistory([]);
    }
  }, [tenantSlug, online]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return { online, syncing, lastResult, history, sync, download, clearCache, loadHistory };
}
