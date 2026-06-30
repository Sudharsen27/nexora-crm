"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getAnalyticsActivities,
  getAnalyticsForecast,
  getAnalyticsOverview,
  getAnalyticsPipeline,
  getAnalyticsRevenue,
  getAnalyticsTasks,
} from "@/lib/api/analytics";
import type {
  AnalyticsActivitiesResponse,
  AnalyticsFilters,
  AnalyticsForecastResponse,
  AnalyticsOverviewResponse,
  AnalyticsPipelineResponse,
  AnalyticsRevenueResponse,
  AnalyticsTasksResponse,
} from "@/types/analytics";

export function useAnalyticsOverview(tenantSlug: string, filters: AnalyticsFilters) {
  const [data, setData] = useState<AnalyticsOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filterKey = JSON.stringify(filters);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getAnalyticsOverview(tenantSlug, filters));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, filterKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useAnalyticsCharts(tenantSlug: string, filters: AnalyticsFilters) {
  const [revenue, setRevenue] = useState<AnalyticsRevenueResponse | null>(null);
  const [pipeline, setPipeline] = useState<AnalyticsPipelineResponse | null>(null);
  const [tasks, setTasks] = useState<AnalyticsTasksResponse | null>(null);
  const [activities, setActivities] = useState<AnalyticsActivitiesResponse | null>(null);
  const [forecast, setForecast] = useState<AnalyticsForecastResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filterKey = JSON.stringify(filters);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        getAnalyticsRevenue(tenantSlug, filters),
        getAnalyticsPipeline(tenantSlug, filters),
        getAnalyticsTasks(tenantSlug, filters),
        getAnalyticsActivities(tenantSlug, filters),
        getAnalyticsForecast(tenantSlug, filters),
      ]);
      if (results[0].status === "fulfilled") setRevenue(results[0].value);
      if (results[1].status === "fulfilled") setPipeline(results[1].value);
      if (results[2].status === "fulfilled") setTasks(results[2].value);
      if (results[3].status === "fulfilled") setActivities(results[3].value);
      if (results[4].status === "fulfilled") setForecast(results[4].value);
      const failed = results.find((r) => r.status === "rejected");
      if (failed?.status === "rejected") {
        setError(failed.reason instanceof Error ? failed.reason.message : "Some charts failed to load");
      }
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, filterKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return useMemo(
    () => ({ revenue, pipeline, tasks, activities, forecast, loading, error, refresh }),
    [revenue, pipeline, tasks, activities, forecast, loading, error, refresh],
  );
}
