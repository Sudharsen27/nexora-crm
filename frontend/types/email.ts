export const EMAIL_FOLDERS = [
  "inbox",
  "sent",
  "drafts",
  "scheduled",
  "starred",
  "archive",
  "trash",
] as const;

export type EmailFolder = (typeof EMAIL_FOLDERS)[number];

export const EMAIL_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type EmailPriority = (typeof EMAIL_PRIORITIES)[number];

export const EMAIL_STATUSES = ["draft", "scheduled", "sending", "sent", "failed", "received"] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export const TEMPLATE_CATEGORIES = [
  "sales",
  "support",
  "follow_up",
  "welcome",
  "reminder",
  "marketing",
] as const;

export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export interface EmailRecipient {
  id?: string;
  recipient_type: "to" | "cc" | "bcc";
  email_address: string;
  display_name?: string | null;
  user_id?: string | null;
  contact_id?: string | null;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

export interface EmailLog {
  id: string;
  event_type: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface EmailUserRef {
  id: string;
  full_name: string;
  email: string;
}

export interface Email {
  id: string;
  tenant_id: string;
  thread_id?: string | null;
  parent_email_id?: string | null;
  sender_id?: string | null;
  sender?: EmailUserRef | null;
  created_by_id?: string | null;
  created_by?: EmailUserRef | null;
  template_id?: string | null;
  from_email?: string | null;
  from_name?: string | null;
  subject: string;
  body_html?: string | null;
  body_text?: string | null;
  status: EmailStatus;
  priority: EmailPriority;
  folder: EmailFolder | string;
  direction: string;
  is_read: boolean;
  is_starred: boolean;
  is_important: boolean;
  has_attachments: boolean;
  scheduled_at?: string | null;
  sent_at?: string | null;
  archived_at?: string | null;
  company_id?: string | null;
  contact_id?: string | null;
  lead_id?: string | null;
  deal_id?: string | null;
  task_id?: string | null;
  meeting_id?: string | null;
  activity_id?: string | null;
  metadata?: Record<string, unknown> | null;
  recipients: EmailRecipient[];
  attachments: EmailAttachment[];
  logs: EmailLog[];
  created_at: string;
  updated_at: string;
}

export interface EmailListResponse {
  items: Email[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface EmailTemplate {
  id: string;
  tenant_id: string;
  name: string;
  category: TemplateCategory | string;
  subject: string;
  body_html: string;
  body_text?: string | null;
  variables?: string[] | null;
  created_by_id?: string | null;
  created_by?: EmailUserRef | null;
  created_at: string;
  updated_at: string;
}

export interface EmailStatistics {
  unread_count: number;
  drafts_count: number;
  scheduled_count: number;
  sent_today: number;
  sent_this_week: number;
  open_rate: number;
  click_rate: number;
  reply_rate: number;
  delivery_rate: number;
}

export interface EmailUserSettings {
  signature_html?: string | null;
  signature_text?: string | null;
  default_from_name?: string | null;
}

export interface EmailFilters {
  folder?: EmailFolder | string;
  q?: string;
  unread?: boolean;
  starred?: boolean;
  important?: boolean;
  has_attachments?: boolean;
  scheduled?: boolean;
  company_id?: string;
  contact_id?: string;
  lead_id?: string;
  deal_id?: string;
  entity_type?: string;
  entity_id?: string;
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface EmailInput {
  subject?: string;
  body_html?: string;
  body_text?: string;
  priority?: EmailPriority;
  recipients?: EmailRecipient[];
  company_id?: string | null;
  contact_id?: string | null;
  lead_id?: string | null;
  deal_id?: string | null;
  task_id?: string | null;
  meeting_id?: string | null;
  template_id?: string | null;
  parent_email_id?: string | null;
  from_name?: string | null;
}

export interface EmailSendInput extends EmailInput {
  email_id?: string | null;
  include_signature?: boolean;
  recipients: EmailRecipient[];
}

export interface EmailScheduleInput extends EmailSendInput {
  scheduled_at: string;
}
