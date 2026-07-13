import { apiFetch } from "@/lib/api/client";
import type {
  AdminApiKey,
  AdminDashboard,
  AuditLog,
  CustomField,
  FeatureFlag,
  LoginHistoryEntry,
  MfaSetup,
  OrganizationPolicy,
  PermissionMatrix,
  SecurityOverview,
  SsoProvider,
  SystemHealth,
  UserSession,
} from "@/types/admin";

const base = (slug: string) => `/tenants/${slug}/admin`;

export function getAdminDashboard(tenantSlug: string) {
  return apiFetch<AdminDashboard>(`${base(tenantSlug)}/dashboard`);
}

export function getSystemHealth(tenantSlug: string) {
  return apiFetch<SystemHealth>(`${base(tenantSlug)}/health`);
}

export function getOrganizationPolicy(tenantSlug: string) {
  return apiFetch<OrganizationPolicy>(`${base(tenantSlug)}/organization`);
}

export function updateOrganizationPolicy(tenantSlug: string, payload: Partial<OrganizationPolicy>) {
  return apiFetch<OrganizationPolicy>(`${base(tenantSlug)}/organization`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function getAuditLogs(tenantSlug: string, action?: string) {
  const q = action ? `?action=${encodeURIComponent(action)}` : "";
  return apiFetch<AuditLog[]>(`${base(tenantSlug)}/audit-logs${q}`);
}

export function getSessions(tenantSlug: string) {
  return apiFetch<UserSession[]>(`${base(tenantSlug)}/sessions`);
}

export function terminateSession(tenantSlug: string, sessionId: string) {
  return apiFetch<void>(`${base(tenantSlug)}/sessions/${sessionId}`, { method: "DELETE" });
}

export function revokeAllSessions(tenantSlug: string) {
  return apiFetch<{ revoked: number }>(`${base(tenantSlug)}/sessions/revoke-all`, { method: "POST" });
}

export function getLoginHistory(tenantSlug: string) {
  return apiFetch<LoginHistoryEntry[]>(`${base(tenantSlug)}/login-history`);
}

export function getSecurityOverview(tenantSlug: string) {
  return apiFetch<SecurityOverview>(`${base(tenantSlug)}/security`);
}

export function getAdminApiKeys(tenantSlug: string) {
  return apiFetch<AdminApiKey[]>(`${base(tenantSlug)}/api-keys`);
}

export function createAdminApiKey(
  tenantSlug: string,
  payload: { name: string; scopes?: string[]; rate_limit_per_hour?: number },
) {
  return apiFetch<AdminApiKey & { api_key: string }>(`${base(tenantSlug)}/api-keys`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function rotateAdminApiKey(tenantSlug: string, keyId: string) {
  return apiFetch<AdminApiKey & { api_key: string }>(`${base(tenantSlug)}/api-keys/${keyId}/rotate`, {
    method: "POST",
  });
}

export function revokeAdminApiKey(tenantSlug: string, keyId: string) {
  return apiFetch<void>(`${base(tenantSlug)}/api-keys/${keyId}`, { method: "DELETE" });
}

export function getFeatureFlags(tenantSlug: string) {
  return apiFetch<FeatureFlag[]>(`${base(tenantSlug)}/feature-flags`);
}

export function updateFeatureFlag(tenantSlug: string, flagId: string, enabled: boolean) {
  return apiFetch<FeatureFlag>(`${base(tenantSlug)}/feature-flags/${flagId}`, {
    method: "PATCH",
    body: JSON.stringify({ enabled }),
  });
}

export function getCustomFields(tenantSlug: string, entityType?: string) {
  const q = entityType ? `?entity_type=${encodeURIComponent(entityType)}` : "";
  return apiFetch<CustomField[]>(`${base(tenantSlug)}/custom-fields${q}`);
}

export function createCustomField(
  tenantSlug: string,
  payload: { entity_type: string; key: string; label: string; field_type?: string },
) {
  return apiFetch<CustomField>(`${base(tenantSlug)}/custom-fields`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteCustomField(tenantSlug: string, fieldId: string) {
  return apiFetch<void>(`${base(tenantSlug)}/custom-fields/${fieldId}`, { method: "DELETE" });
}

export function getPermissionMatrix(tenantSlug: string) {
  return apiFetch<PermissionMatrix>(`${base(tenantSlug)}/roles/matrix`);
}

export function createRole(
  tenantSlug: string,
  payload: { name: string; slug: string; permission_slugs: string[] },
) {
  return apiFetch<Record<string, string>>(`${base(tenantSlug)}/roles`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getSsoProviders(tenantSlug: string) {
  return apiFetch<SsoProvider[]>(`${base(tenantSlug)}/identity/sso`);
}

export function setupMfa(tenantSlug: string) {
  return apiFetch<MfaSetup>(`${base(tenantSlug)}/identity/mfa/setup`, { method: "POST" });
}

export function verifyMfa(tenantSlug: string, code: string) {
  return apiFetch<{ enabled: boolean }>(`${base(tenantSlug)}/identity/mfa/verify`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}
