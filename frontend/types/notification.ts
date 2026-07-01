export type NotificationCategory =
  | "all"
  | "deals"
  | "companies"
  | "contacts"
  | "tasks"
  | "meetings"
  | "notes"
  | "system";

export type NotificationPriority = "low" | "normal" | "high" | "urgent";

export interface NotificationActor {
  id: string;
  full_name: string;
  email?: string | null;
}

export interface Notification {
  id: string;
  tenant_id: string;
  user_id: string;
  actor_id: string | null;
  actor: NotificationActor | null;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  priority: NotificationPriority | string;
  read: boolean;
  read_at: string | null;
  action_url: string | null;
  metadata: Record<string, unknown> | null;
  archived_at: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  items: Notification[];
  total: number;
  unread_count: number;
  next_cursor: string | null;
  has_more: boolean;
}

export interface NotificationFilters {
  q?: string;
  category?: NotificationCategory;
  unread_only?: boolean;
  cursor?: string;
  page_size?: number;
}
