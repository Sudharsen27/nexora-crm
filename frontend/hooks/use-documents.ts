"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listDocumentFolders,
  listDocuments,
  listSignatureRequests,
} from "@/lib/api/documents";
import type { Document, DocumentFilters, DocumentFolder, SignatureRequest } from "@/types/document";

export function useDocuments(tenantSlug: string, filters: DocumentFilters = {}) {
  const [items, setItems] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filterKey = JSON.stringify(filters);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listDocuments(tenantSlug, filters);
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, filterKey]);

  useEffect(() => {
    void load();
  }, [load]);

  return useMemo(
    () => ({ items, total, loading, error, refresh: load }),
    [items, total, loading, error, load],
  );
}

export function useDocumentFolders(tenantSlug: string) {
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFolders(await listDocumentFolders(tenantSlug));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load folders");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  return useMemo(
    () => ({ folders, loading, error, refresh: load }),
    [folders, loading, error, load],
  );
}

export function useSignatureRequests(tenantSlug: string) {
  const [items, setItems] = useState<SignatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listSignatureRequests(tenantSlug));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load signatures");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  return useMemo(
    () => ({ items, loading, error, refresh: load }),
    [items, loading, error, load],
  );
}
