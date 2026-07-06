const PORTAL_ACCESS = "nexora_portal_access_token";
const PORTAL_REFRESH = "nexora_portal_refresh_token";
const PORTAL_TENANT = "nexora_portal_tenant_slug";

export function getPortalAccessTokenFromCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)nexora_portal_access_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function getPortalAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PORTAL_ACCESS) ?? getPortalAccessTokenFromCookie(document.cookie);
}

export function getPortalRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PORTAL_REFRESH);
}

export function getPortalTenantSlug(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PORTAL_TENANT);
}

export function setPortalTokens(access: string, refresh: string, tenantSlug: string) {
  localStorage.setItem(PORTAL_ACCESS, access);
  localStorage.setItem(PORTAL_REFRESH, refresh);
  localStorage.setItem(PORTAL_TENANT, tenantSlug);
  document.cookie = `nexora_portal_access_token=${access}; path=/; max-age=${60 * 15}; SameSite=Lax`;
}

export function clearPortalTokens() {
  localStorage.removeItem(PORTAL_ACCESS);
  localStorage.removeItem(PORTAL_REFRESH);
  localStorage.removeItem(PORTAL_TENANT);
  document.cookie = "nexora_portal_access_token=; path=/; max-age=0";
}
