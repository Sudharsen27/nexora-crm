import { apiFetch } from "@/lib/api/client";
import type {
  CliResult,
  DeveloperDashboard,
  DeveloperProfile,
  GraphQLResult,
  MarketplaceList,
  MarketplaceReview,
  PlatformWebhook,
  PlatformWebhookLog,
  PluginDetail,
  PluginInstallation,
  PluginLog,
  RestExplorerResult,
  SdkProject,
} from "@/types/developers";

const base = (slug: string) => `/tenants/${slug}/developers`;

export function getDeveloperDashboard(tenantSlug: string) {
  return apiFetch<DeveloperDashboard>(`${base(tenantSlug)}/dashboard`);
}

export function listMarketplace(
  tenantSlug: string,
  params?: { category?: string; plugin_type?: string; search?: string; featured?: boolean },
) {
  const q = new URLSearchParams();
  if (params?.category) q.set("category", params.category);
  if (params?.plugin_type) q.set("plugin_type", params.plugin_type);
  if (params?.search) q.set("search", params.search);
  if (params?.featured) q.set("featured", "true");
  const qs = q.toString();
  return apiFetch<MarketplaceList>(`${base(tenantSlug)}/marketplace${qs ? `?${qs}` : ""}`);
}

export function getPlugin(tenantSlug: string, pluginId: string) {
  return apiFetch<PluginDetail>(`${base(tenantSlug)}/plugins/${pluginId}`);
}

export function listInstalledPlugins(tenantSlug: string) {
  return apiFetch<PluginInstallation[]>(`${base(tenantSlug)}/plugins/installed`);
}

export function installPlugin(tenantSlug: string, pluginSlug: string, settings: Record<string, unknown> = {}) {
  return apiFetch<PluginInstallation>(`${base(tenantSlug)}/plugins/install`, {
    method: "POST",
    body: JSON.stringify({ plugin_slug: pluginSlug, settings }),
  });
}

export function uninstallPlugin(tenantSlug: string, installationId: string) {
  return apiFetch<{ ok: boolean }>(`${base(tenantSlug)}/installations/${installationId}`, {
    method: "DELETE",
  });
}

export function enablePlugin(tenantSlug: string, installationId: string) {
  return apiFetch<PluginInstallation>(`${base(tenantSlug)}/installations/${installationId}/enable`, {
    method: "POST",
  });
}

export function disablePlugin(tenantSlug: string, installationId: string) {
  return apiFetch<PluginInstallation>(`${base(tenantSlug)}/installations/${installationId}/disable`, {
    method: "POST",
  });
}

export function updatePlugin(tenantSlug: string, installationId: string) {
  return apiFetch<PluginInstallation>(`${base(tenantSlug)}/installations/${installationId}/update`, {
    method: "POST",
  });
}

export function listPluginLogs(tenantSlug: string, pluginId?: string) {
  const qs = pluginId ? `?plugin_id=${pluginId}` : "";
  return apiFetch<PluginLog[]>(`${base(tenantSlug)}/logs${qs}`);
}

export function addPluginReview(
  tenantSlug: string,
  pluginId: string,
  payload: { rating: number; title?: string; body?: string },
) {
  return apiFetch<MarketplaceReview>(`${base(tenantSlug)}/plugins/${pluginId}/reviews`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listWebhooks(tenantSlug: string) {
  return apiFetch<PlatformWebhook[]>(`${base(tenantSlug)}/webhooks`);
}

export function createWebhook(
  tenantSlug: string,
  payload: { name: string; url: string; events?: string[]; retry_limit?: number },
) {
  return apiFetch<PlatformWebhook>(`${base(tenantSlug)}/webhooks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function testWebhook(tenantSlug: string, webhookId: string) {
  return apiFetch<PlatformWebhookLog>(`${base(tenantSlug)}/webhooks/${webhookId}/test`, {
    method: "POST",
  });
}

export function deleteWebhook(tenantSlug: string, webhookId: string) {
  return apiFetch<{ ok: boolean }>(`${base(tenantSlug)}/webhooks/${webhookId}`, { method: "DELETE" });
}

export function listWebhookLogs(tenantSlug: string, webhookId?: string) {
  const qs = webhookId ? `?webhook_id=${webhookId}` : "";
  return apiFetch<PlatformWebhookLog[]>(`${base(tenantSlug)}/webhook-logs${qs}`);
}

export function retryWebhookLog(tenantSlug: string, logId: string) {
  return apiFetch<PlatformWebhookLog>(`${base(tenantSlug)}/webhook-logs/${logId}/retry`, {
    method: "POST",
  });
}

export function listSdkProjects(tenantSlug: string) {
  return apiFetch<SdkProject[]>(`${base(tenantSlug)}/sdk/projects`);
}

export function createSdkProject(
  tenantSlug: string,
  payload: { name: string; project_type?: string; description?: string },
) {
  return apiFetch<SdkProject>(`${base(tenantSlug)}/sdk/projects`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function runApiExplorer(
  tenantSlug: string,
  payload: { method: string; path: string; body?: Record<string, unknown> | null },
) {
  return apiFetch<RestExplorerResult>(`${base(tenantSlug)}/api-explorer`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getGraphqlSchema(tenantSlug: string) {
  return apiFetch<{ sdl: string }>(`${base(tenantSlug)}/graphql/schema`);
}

export function runGraphql(tenantSlug: string, query: string, variables: Record<string, unknown> = {}) {
  return apiFetch<GraphQLResult>(`${base(tenantSlug)}/graphql`, {
    method: "POST",
    body: JSON.stringify({ query, variables }),
  });
}

export function runCli(
  tenantSlug: string,
  payload: { action: string; name?: string; plugin_type?: string; version?: string },
) {
  return apiFetch<CliResult>(`${base(tenantSlug)}/cli`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function upsertDeveloperProfile(
  tenantSlug: string,
  payload: { display_name: string; email?: string; website?: string; bio?: string },
) {
  return apiFetch<DeveloperProfile>(`${base(tenantSlug)}/profile`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
