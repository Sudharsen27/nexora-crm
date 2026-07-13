"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getAdminDashboard,
  getAuditLogs,
  getCustomFields,
  getFeatureFlags,
  getOrganizationPolicy,
  getPermissionMatrix,
  getSecurityOverview,
  getSessions,
  getSsoProviders,
  getAdminApiKeys as fetchApiKeys,
} from "@/lib/api/admin";
import type {
  AdminDashboard,
  AuditLog,
  CustomField,
  FeatureFlag,
  OrganizationPolicy,
  PermissionMatrix,
  SecurityOverview,
  SsoProvider,
  AdminApiKey,
  UserSession,
} from "@/types/admin";

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

export function useAdminDashboard(tenantSlug: string) {
  return useAsyncData(() => getAdminDashboard(tenantSlug), [tenantSlug]);
}

export function useOrganizationPolicy(tenantSlug: string) {
  return useAsyncData(() => getOrganizationPolicy(tenantSlug), [tenantSlug]);
}

export function useAuditLogs(tenantSlug: string, action?: string) {
  return useAsyncData(() => getAuditLogs(tenantSlug, action), [tenantSlug, action]);
}

export function useAdminSessions(tenantSlug: string) {
  return useAsyncData(() => getSessions(tenantSlug), [tenantSlug]);
}

export function useSecurityOverview(tenantSlug: string) {
  return useAsyncData(() => getSecurityOverview(tenantSlug), [tenantSlug]);
}

export function useAdminApiKeys(tenantSlug: string) {
  return useAsyncData(() => fetchApiKeys(tenantSlug), [tenantSlug]);
}

export function useFeatureFlags(tenantSlug: string) {
  return useAsyncData(() => getFeatureFlags(tenantSlug), [tenantSlug]);
}

export function useCustomFields(tenantSlug: string, entityType?: string) {
  return useAsyncData(() => getCustomFields(tenantSlug, entityType), [tenantSlug, entityType]);
}

export function usePermissionMatrix(tenantSlug: string) {
  return useAsyncData(() => getPermissionMatrix(tenantSlug), [tenantSlug]);
}

export function useSsoProviders(tenantSlug: string) {
  return useAsyncData(() => getSsoProviders(tenantSlug), [tenantSlug]);
}

export type {
  AdminDashboard,
  AuditLog,
  CustomField,
  FeatureFlag,
  OrganizationPolicy,
  PermissionMatrix,
  SecurityOverview,
  SsoProvider,
  AdminApiKey,
  UserSession,
};
