export interface MarketplaceApp {
  id: string;
  slug: string;
  name: string;
  vendor: string;
  category: string;
  description: string | null;
  icon: string;
  auth_type: string;
  is_popular: boolean;
  is_recommended: boolean;
  is_developer: boolean;
  capabilities: string[];
  install_count: number;
  is_installed: boolean;
}

export interface IntegrationSummary {
  id: string;
  status: string;
  health: string;
  sync_mode: string;
  auto_sync: boolean;
  last_sync_at: string | null;
  connected_at: string | null;
  last_error: string | null;
  app_slug: string;
  app_name: string;
  app_icon: string;
  app_category: string;
}

export interface IntegrationDetail extends IntegrationSummary {
  settings: Record<string, unknown>;
  permissions: string[];
  sync_interval_minutes: number;
  marketplace_app_id: string;
  account_label: string | null;
  auth_type: string | null;
}

export interface MarketplaceListResponse {
  apps: MarketplaceApp[];
  categories: string[];
  total: number;
}

export interface IntegrationDashboard {
  installed_count: number;
  connected_count: number;
  healthy_count: number;
  error_count: number;
  webhook_count: number;
  api_key_count: number;
  total_api_calls: number;
  recent_syncs: SyncHistoryItem[];
  recent_webhook_logs: WebhookLogItem[];
  installed_apps: IntegrationSummary[];
}

export interface SyncHistoryItem {
  id: string;
  sync_mode: string;
  status: string;
  records_processed: number;
  records_failed: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface WebhookItem {
  id: string;
  name: string;
  url: string;
  events: string[];
  status: string;
  retry_count: number;
  last_triggered_at: string | null;
  integration_id: string | null;
}

export interface WebhookLogItem {
  id: string;
  webhook_id: string;
  event_type: string;
  status: string;
  status_code: number | null;
  attempt: number;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  status: string;
  last_used_at: string | null;
  expires_at: string | null;
  usage_count: number;
  rate_limit_per_hour: number;
  created_at: string;
}

export interface ApiKeyCreated extends ApiKeyItem {
  api_key: string;
}

export interface IntegrationHealth {
  integration_id: string;
  health: string;
  status: string;
  last_sync_at: string | null;
  last_error: string | null;
  latency_ms: number | null;
  checks: { name: string; status: string }[];
}
