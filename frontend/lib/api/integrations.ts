import { apiFetch } from "@/lib/api/client";
import type {
  ApiKeyCreated,
  ApiKeyItem,
  IntegrationDashboard,
  IntegrationDetail,
  IntegrationHealth,
  IntegrationSummary,
  MarketplaceListResponse,
  SyncHistoryItem,
  WebhookItem,
  WebhookLogItem,
} from "@/types/integrations";

export async function getIntegrationDashboard(slug: string): Promise<IntegrationDashboard> {
  return apiFetch<IntegrationDashboard>(`/tenants/${slug}/integrations/dashboard`);
}

export async function listMarketplace(
  slug: string,
  params: Record<string, string | boolean> = {},
): Promise<MarketplaceListResponse> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== "" && v !== false) qs.set(k, String(v));
  });
  const query = qs.toString();
  return apiFetch<MarketplaceListResponse>(
    `/tenants/${slug}/integrations/marketplace${query ? `?${query}` : ""}`,
  );
}

export async function listInstalledIntegrations(slug: string): Promise<IntegrationSummary[]> {
  return apiFetch<IntegrationSummary[]>(`/tenants/${slug}/integrations/installed`);
}

export async function installIntegration(slug: string, appSlug: string): Promise<IntegrationDetail> {
  return apiFetch<IntegrationDetail>(`/tenants/${slug}/integrations/install`, {
    method: "POST",
    body: JSON.stringify({ app_slug: appSlug }),
  });
}

export async function getIntegration(slug: string, id: string): Promise<IntegrationDetail> {
  return apiFetch<IntegrationDetail>(`/tenants/${slug}/integrations/${id}`);
}

export async function connectIntegration(
  slug: string,
  id: string,
  payload: { api_key?: string; api_secret?: string; oauth_code?: string; label?: string },
): Promise<IntegrationDetail> {
  return apiFetch<IntegrationDetail>(`/tenants/${slug}/integrations/${id}/connect`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function disconnectIntegration(slug: string, id: string): Promise<IntegrationDetail> {
  return apiFetch<IntegrationDetail>(`/tenants/${slug}/integrations/${id}/disconnect`, { method: "POST" });
}

export async function reconnectIntegration(slug: string, id: string): Promise<IntegrationDetail> {
  return apiFetch<IntegrationDetail>(`/tenants/${slug}/integrations/${id}/reconnect`, { method: "POST" });
}

export async function syncIntegration(slug: string, id: string): Promise<SyncHistoryItem> {
  return apiFetch<SyncHistoryItem>(`/tenants/${slug}/integrations/${id}/sync`, { method: "POST" });
}

export async function getIntegrationHealth(slug: string, id: string): Promise<IntegrationHealth> {
  return apiFetch<IntegrationHealth>(`/tenants/${slug}/integrations/${id}/health`);
}

export async function getOAuthAuthorizeUrl(
  slug: string,
  id: string,
): Promise<{ authorize_url: string; state: string }> {
  return apiFetch(`/tenants/${slug}/integrations/${id}/oauth/authorize`);
}

export async function completeOAuthCallback(
  slug: string,
  state: string,
  code: string,
): Promise<IntegrationDetail> {
  return apiFetch<IntegrationDetail>(
    `/tenants/${slug}/integrations/oauth/callback?state=${encodeURIComponent(state)}&code=${encodeURIComponent(code)}`,
    { method: "POST" },
  );
}

export async function listWebhooks(slug: string): Promise<WebhookItem[]> {
  return apiFetch<WebhookItem[]>(`/tenants/${slug}/integrations/webhooks`);
}

export async function createWebhook(
  slug: string,
  payload: { name: string; url: string; events?: string[] },
): Promise<WebhookItem> {
  return apiFetch<WebhookItem>(`/tenants/${slug}/integrations/webhooks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteWebhook(slug: string, id: string): Promise<void> {
  return apiFetch<void>(`/tenants/${slug}/integrations/webhooks/${id}`, { method: "DELETE" });
}

export async function testWebhook(slug: string, id: string): Promise<WebhookLogItem> {
  return apiFetch<WebhookLogItem>(`/tenants/${slug}/integrations/webhooks/${id}/test`, { method: "POST" });
}

export async function listApiKeys(slug: string): Promise<ApiKeyItem[]> {
  return apiFetch<ApiKeyItem[]>(`/tenants/${slug}/integrations/api-keys`);
}

export async function createApiKey(
  slug: string,
  payload: { name: string; scopes?: string[] },
): Promise<ApiKeyCreated> {
  return apiFetch<ApiKeyCreated>(`/tenants/${slug}/integrations/api-keys`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function revokeApiKey(slug: string, id: string): Promise<void> {
  return apiFetch<void>(`/tenants/${slug}/integrations/api-keys/${id}`, { method: "DELETE" });
}
