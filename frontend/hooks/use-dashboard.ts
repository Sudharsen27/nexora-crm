"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getDashboard } from "@/lib/api/dashboard";
import type { DashboardFilters, DashboardResponse } from "@/types/dashboard";

export function useDashboard(tenantSlug: string, filters: DashboardFilters) {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filterKey = JSON.stringify(filters);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDashboard(tenantSlug, filters);
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, filterKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(
    () => ({ data, loading, error, refresh }),
    [data, loading, error, refresh],
  );
}
