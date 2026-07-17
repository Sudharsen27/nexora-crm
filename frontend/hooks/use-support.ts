"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getSupportAnalytics,
  getSupportDashboard,
  getTicket,
  listChats,
  listKnowledge,
  listSlaPolicies,
  listTickets,
} from "@/lib/api/support";
import type {
  ChatListResponse,
  KnowledgeArticleListResponse,
  SlaPolicyListResponse,
  SupportAnalytics,
  SupportDashboard,
  SupportTicketDetail,
  SupportTicketListResponse,
  TicketFilters,
} from "@/types/support";

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

export function useSupportDashboard(tenantSlug: string) {
  return useAsyncData(() => getSupportDashboard(tenantSlug), [tenantSlug]);
}

export function useSupportTickets(tenantSlug: string, filters: TicketFilters = {}) {
  const filterKey = JSON.stringify(filters);
  return useAsyncData(
    () => listTickets(tenantSlug, filters),
    [tenantSlug, filterKey],
  );
}

export function useSupportTicket(tenantSlug: string, ticketId: string | null) {
  const [data, setData] = useState<SupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(ticketId));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!ticketId) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await getTicket(tenantSlug, ticketId);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, ticketId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useSupportAnalytics(tenantSlug: string, days = 30) {
  return useAsyncData(() => getSupportAnalytics(tenantSlug, days), [tenantSlug, days]);
}

export function useSupportChats(
  tenantSlug: string,
  filters: { status?: string; page?: number; page_size?: number } = {},
) {
  const filterKey = JSON.stringify(filters);
  return useAsyncData(() => listChats(tenantSlug, filters), [tenantSlug, filterKey]);
}

export function useSupportKnowledge(
  tenantSlug: string,
  filters: { q?: string; status?: string; page?: number; page_size?: number } = {},
) {
  const filterKey = JSON.stringify(filters);
  return useAsyncData(() => listKnowledge(tenantSlug, filters), [tenantSlug, filterKey]);
}

export function useSlaPolicies(tenantSlug: string) {
  return useAsyncData(() => listSlaPolicies(tenantSlug), [tenantSlug]);
}

export type {
  ChatListResponse,
  KnowledgeArticleListResponse,
  SlaPolicyListResponse,
  SupportAnalytics,
  SupportDashboard,
  SupportTicketDetail,
  SupportTicketListResponse,
};
