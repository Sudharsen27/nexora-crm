export interface AdminDashboard {
  organization_name: string;
  user_count: number;
  active_sessions: number;
  security_score: number;
  audit_events_24h: number;
  api_keys_active: number;
  storage_used_mb: number;
  feature_flags_enabled: number;
  custom_fields_count: number;
  failed_logins_24h: number;
  open_security_events: number;
}

export interface OrganizationPolicy {
  logo_url: string | null;
  primary_color: string;
  custom_domains: string[];
  timezone: string;
  locale: string;
  currency: string;
  business_hours: Record<string, unknown>;
  branding: Record<string, unknown>;
  password_policy: Record<string, unknown>;
  sso_config: Record<string, unknown>;
  security_settings: Record<string, unknown>;
  maintenance_mode: boolean;
  preferences: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  resource: string;
  resource_id: string | null;
  description: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface UserSession {
  id: string;
  user_id: string;
  status: string;
  device_name: string | null;
  user_agent: string | null;
  ip_address: string | null;
  location: string | null;
  is_current: boolean;
  last_active_at: string | null;
  created_at: string;
  expires_at: string;
}

export interface LoginHistoryEntry {
  id: string;
  user_id: string | null;
  email: string;
  result: string;
  ip_address: string | null;
  user_agent: string | null;
  location: string | null;
  failure_reason: string | null;
  created_at: string;
}

export interface SecurityOverview {
  security_score: number;
  failed_logins_24h: number;
  blocked_ips: string[];
  suspicious_logins: number;
  active_sessions: number;
  trusted_devices: number;
  mfa_enabled_users: number;
  open_events: Array<Record<string, unknown>>;
  password_policy: Record<string, unknown>;
}

export interface AdminApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  status: string;
  rate_limit_per_hour: number;
  usage_count: number;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  scope: string;
  rollout_percentage: number;
  created_at: string;
}

export interface CustomField {
  id: string;
  entity_type: string;
  key: string;
  label: string;
  field_type: string;
  required: boolean;
  options: string[];
  default_value: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface PermissionMatrix {
  permissions: Array<{ slug: string; resource: string; action: string }>;
  roles: Array<{
    id: string;
    name: string;
    slug: string;
    is_system: boolean;
    permissions: string[];
  }>;
}

export interface SsoProvider {
  provider: string;
  enabled: boolean;
  configured: boolean;
}

export interface MfaSetup {
  method: string;
  secret: string;
  qr_uri: string;
  backup_codes: string[];
}

export interface SystemHealth {
  status: string;
  database: string;
  api_version: string;
  uptime_hint: string;
  maintenance_mode: boolean;
}
