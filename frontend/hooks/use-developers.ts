"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getDeveloperDashboard,
  listInstalledPlugins,
  listMarketplace,
  listSdkProjects,
  listWebhookLogs,
  listWebhooks,
} from "@/lib/api/developers";
import type {
  DeveloperDashboard,
  MarketplaceList,
  PlatformWebhook,
  PlatformWebhookLog,
  PluginInstallation,
  SdkProject,
} from "@/types/developers";

function useAsyncData<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loader();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useDeveloperDashboard(tenantSlug: string) {
  return useAsyncData(() => getDeveloperDashboard(tenantSlug), [tenantSlug]);
}

export function useMarketplace(
  tenantSlug: string,
  params?: { category?: string; plugin_type?: string; search?: string; featured?: boolean },
) {
  return useAsyncData(
    () => listMarketplace(tenantSlug, params),
    [tenantSlug, params?.category, params?.plugin_type, params?.search, params?.featured],
  );
}

export function useInstalledPlugins(tenantSlug: string) {
  return useAsyncData(() => listInstalledPlugins(tenantSlug), [tenantSlug]);
}

export function usePlatformWebhooks(tenantSlug: string) {
  return useAsyncData(() => listWebhooks(tenantSlug), [tenantSlug]);
}

export function useWebhookLogs(tenantSlug: string) {
  return useAsyncData(() => listWebhookLogs(tenantSlug), [tenantSlug]);
}

export function useSdkProjects(tenantSlug: string) {
  return useAsyncData(() => listSdkProjects(tenantSlug), [tenantSlug]);
}

export type {
  DeveloperDashboard,
  MarketplaceList,
  PlatformWebhook,
  PlatformWebhookLog,
  PluginInstallation,
  SdkProject,
};
