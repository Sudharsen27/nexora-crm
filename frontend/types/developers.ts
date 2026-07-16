export interface DeveloperProfile {
  id: string;
  slug: string;
  display_name: string;
  email: string | null;
  website: string | null;
  bio: string | null;
  status: string;
  verified: boolean;
  api_calls_30d: number;
  created_at: string;
}

export interface PluginSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  plugin_type: string;
  category: string;
  icon: string;
  status: string;
  latest_version: string;
  permissions: string[];
  is_featured: boolean;
  is_official: boolean;
  install_count: number;
  avg_rating: number;
  review_count: number;
  installed: boolean;
  install_status: string | null;
}

export interface PluginVersion {
  id: string;
  version: string;
  changelog: string | null;
  package_url: string | null;
  min_platform_version: string;
  is_yanked: boolean;
  download_count: number;
  created_at: string;
}

export interface MarketplaceReview {
  id: string;
  plugin_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified_install: boolean;
  created_at: string;
}

export interface PluginDetail extends PluginSummary {
  dependencies: string[];
  settings_schema: Record<string, unknown>;
  manifest: Record<string, unknown>;
  versions: PluginVersion[];
  reviews: MarketplaceReview[];
}

export interface PluginInstallation {
  id: string;
  plugin_id: string;
  installed_version: string;
  status: string;
  settings: Record<string, unknown>;
  granted_permissions: string[];
  last_error: string | null;
  enabled_at: string | null;
  disabled_at: string | null;
  created_at: string;
  plugin: PluginSummary | null;
}

export interface PluginLog {
  id: string;
  plugin_id: string | null;
  level: string;
  event: string;
  message: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface MarketplaceList {
  items: PluginSummary[];
  total: number;
  categories: string[];
  types: string[];
}

export interface PlatformWebhook {
  id: string;
  name: string;
  url: string;
  secret: string | null;
  events: string[];
  status: string;
  retry_limit: number;
  success_count: number;
  failure_count: number;
  last_triggered_at: string | null;
  created_at: string;
}

export interface PlatformWebhookLog {
  id: string;
  webhook_id: string;
  event_type: string;
  status: string;
  status_code: number | null;
  attempt: number;
  duration_ms: number;
  request_payload: Record<string, unknown>;
  response_body: string | null;
  error_message: string | null;
  created_at: string;
}

export interface SdkProject {
  id: string;
  name: string;
  slug: string;
  project_type: string;
  description: string | null;
  sdk_version: string;
  status: string;
  config: Record<string, unknown>;
  sample_code: string | null;
  created_at: string;
}

export interface RestExplorerResult {
  status_code: number;
  duration_ms: number;
  headers: Record<string, string>;
  body: unknown;
}

export interface GraphQLResult {
  data: Record<string, unknown> | null;
  errors: { message: string }[] | null;
  extensions: Record<string, unknown> | null;
}

export interface CliResult {
  success: boolean;
  action: string;
  message: string;
  output: Record<string, unknown>;
}

export interface DeveloperDashboard {
  installed_plugins: number;
  enabled_plugins: number;
  marketplace_plugins: number;
  featured_plugins: number;
  webhook_count: number;
  webhook_failures_24h: number;
  api_calls_24h: number;
  sdk_projects: number;
  developer: DeveloperProfile | null;
  recent_installs: PluginInstallation[];
  recent_webhook_logs: PlatformWebhookLog[];
  featured: PluginSummary[];
  api_usage: { resource: string; count: number }[];
  docs: { slug: string; title: string; summary: string }[];
  cli_commands: { command: string; description: string }[];
  graphql_sdl: string;
}
