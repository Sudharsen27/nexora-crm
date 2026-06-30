"use client";

import { useCallback, useEffect, useState } from "react";
import { getDealStatistics } from "@/lib/api/deals";
import type { DealStatistics } from "@/types/api";

export function useDealStatistics(tenantSlug: string) {
  const [stats, setStats] = useState<DealStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDealStatistics(tenantSlug);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load statistics");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  return { stats, loading, error, reload: load };
}
