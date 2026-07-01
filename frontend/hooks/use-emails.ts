"use client";

import { useCallback, useEffect, useState } from "react";
import { getEmailStatistics, listEmails } from "@/lib/api/emails";
import type { Email, EmailFilters, EmailStatistics } from "@/types/email";

export function useEmails(tenantSlug: string, filters: EmailFilters = {}) {
  const [items, setItems] = useState<Email[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filterKey = JSON.stringify(filters);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listEmails(tenantSlug, filters);
      setItems(data.items);
      setTotal(data.total);
      setPages(data.total_pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load emails");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, filterKey]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, total, pages, loading, error, refresh };
}

export function useEmailStatistics(tenantSlug: string) {
  const [stats, setStats] = useState<EmailStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getEmailStatistics(tenantSlug);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load statistics");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { stats, loading, error, refresh };
}
