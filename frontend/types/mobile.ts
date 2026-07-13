export type CacheResource =
  | "dashboard"
  | "companies"
  | "contacts"
  | "leads"
  | "deals"
  | "tasks"
  | "calendar"
  | "meetings"
  | "notes"
  | "documents"
  | "notifications"
  | "activities"
  | "ai_history"
  | "settings";

export interface OfflineQueueItem {
  client_id: string;
  resource: string;
  action: string;
  entity_id?: string | null;
  payload: Record<string, unknown>;
}

export interface OfflineQueueItemResponse extends OfflineQueueItem {
  id: string;
  status: string;
  retry_count: number;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface SyncSession {
  id: string;
  direction: string;
  status: string;
  resources: string[];
  items_uploaded: number;
  items_downloaded: number;
  conflicts_found: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

export interface SyncConflict {
  id: string;
  resource: string;
  entity_id: string;
  client_version: Record<string, unknown>;
  server_version: Record<string, unknown>;
  status: string;
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface MobileSettings {
  offline_enabled: boolean;
  background_sync: boolean;
  push_enabled: boolean;
  auto_download: boolean;
  cache_resources: string[];
  last_sync_at: string | null;
  storage_used_bytes: number;
  preferences: Record<string, unknown>;
}

export interface MobileDashboard {
  is_online: boolean;
  offline_queue_pending: number;
  open_conflicts: number;
  last_sync_at: string | null;
  storage_used_bytes: number;
  push_subscriptions: number;
  recent_sessions: SyncSession[];
  cacheable_resources: string[];
}

export interface SyncDataResponse {
  session: SyncSession;
  data: Record<string, Record<string, unknown>[]>;
  conflicts: SyncConflict[];
  server_time: string;
}

export interface PushSubscriptionInfo {
  id: string;
  endpoint: string;
  status: string;
  preferences: Record<string, unknown>;
  created_at: string;
  last_used_at: string | null;
}

export interface CachedEntity {
  id: string;
  resource: CacheResource;
  data: Record<string, unknown>;
  updated_at: string;
  synced_at: string;
}

export interface StorageStats {
  usedBytes: number;
  itemCount: number;
  resources: Record<string, number>;
}
