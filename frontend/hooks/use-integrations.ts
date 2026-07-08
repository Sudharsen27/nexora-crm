"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getIntegrationDashboard,
  listInstalledIntegrations,
  listMarketplace,
} from "@/lib/api/integrations";
import type {
  IntegrationDashboard,
  IntegrationSummary,
  MarketplaceListResponse,
} from "@/types/integrations";

export function useIntegrationDashboard(tenantSlug: string) {
  const [data, setData] = useState<IntegrationDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getIntegrationDashboard(tenantSlug));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load integrations dashboard");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useMarketplace(tenantSlug: string, filters: Record<string, string | boolean> = {}) {
  const [data, setData] = useState<MarketplaceListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const filterKey = JSON.stringify(filters);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await listMarketplace(tenantSlug, filters));
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, filterKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, refresh };
}

export function useInstalledIntegrations(tenantSlug: string) {
  const [data, setData] = useState<IntegrationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await listInstalledIntegrations(tenantSlug));
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, refresh };
}
