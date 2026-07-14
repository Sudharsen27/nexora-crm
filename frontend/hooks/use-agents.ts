"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getAgentsDashboard,
  listAgents,
  listExecutions,
  listInsights,
  listMemory,
  listRecommendations,
} from "@/lib/api/agents";
import type {
  AgentsDashboard,
  AiAgent,
  AiAgentExecution,
  AiAgentMemory,
  AiInsight,
  AiRecommendation,
} from "@/types/agents";

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

export function useAgentsDashboard(tenantSlug: string) {
  return useAsyncData(() => getAgentsDashboard(tenantSlug), [tenantSlug]);
}

export function useAgents(tenantSlug: string) {
  return useAsyncData(() => listAgents(tenantSlug), [tenantSlug]);
}

export function useAgentExecutions(tenantSlug: string, agentId?: string) {
  return useAsyncData(() => listExecutions(tenantSlug, agentId), [tenantSlug, agentId]);
}

export function useAgentRecommendations(tenantSlug: string) {
  return useAsyncData(() => listRecommendations(tenantSlug, "pending"), [tenantSlug]);
}

export function useAgentInsights(tenantSlug: string) {
  return useAsyncData(() => listInsights(tenantSlug), [tenantSlug]);
}

export function useAgentMemory(tenantSlug: string, agentId?: string) {
  return useAsyncData(() => listMemory(tenantSlug, agentId), [tenantSlug, agentId]);
}

export type {
  AgentsDashboard,
  AiAgent,
  AiAgentExecution,
  AiAgentMemory,
  AiInsight,
  AiRecommendation,
};
