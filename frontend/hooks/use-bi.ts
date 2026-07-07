"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getBiExecutive,
  listBiDashboards,
  listBiReports,
  listBiKpis,
  generateBiForecast,
} from "@/lib/api/bi";
import type {
  BiDashboardSummary,
  BiExecutiveSummary,
  BiFilters,
  BiForecastResponse,
  BiKpiResponse,
  BiReportSummary,
} from "@/types/bi";

export function useBiExecutive(tenantSlug: string, filters: BiFilters) {
  const [data, setData] = useState<BiExecutiveSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filterKey = JSON.stringify(filters);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getBiExecutive(tenantSlug, filters));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load executive dashboard");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, filterKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useBiDashboards(tenantSlug: string) {
  const [data, setData] = useState<BiDashboardSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await listBiDashboards(tenantSlug));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboards");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useBiReports(tenantSlug: string) {
  const [data, setData] = useState<BiReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await listBiReports(tenantSlug));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useBiKpis(tenantSlug: string) {
  const [data, setData] = useState<BiKpiResponse[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setData(await listBiKpis(tenantSlug));
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, refresh };
}

export function useBiForecast(tenantSlug: string) {
  const [data, setData] = useState<BiForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (forecastType = "revenue") => {
      setLoading(true);
      setError(null);
      try {
        const result = await generateBiForecast(tenantSlug, forecastType);
        setData(result);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Forecast failed";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [tenantSlug],
  );

  return { data, loading, error, generate };
}
