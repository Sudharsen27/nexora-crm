export interface PortalUser {
  id: string;
  email: string;
  full_name: string;
  job_title: string | null;
  phone: string | null;
  contact_id: string;
  company_id: string | null;
  company_name: string | null;
  tenant_slug: string;
  tenant_name: string;
}

export interface PortalKpi {
  key: string;
  label: string;
  value: string | number;
  hint?: string | null;
}

export interface PortalDeal {
  id: string;
  title: string;
  stage: string;
  stage_label: string;
  value: string | null;
  currency: string;
  probability: number;
  expected_close_date: string | null;
  updated_at: string;
}

export interface PortalDealDetail extends PortalDeal {
  description: string | null;
  timeline: PortalTimelineItem[];
}

export interface PortalDocument {
  id: string;
  name: string;
  status: string;
  mime_type: string;
  size_bytes: number;
  current_version: number;
  updated_at: string;
  deal_id?: string | null;
}

export interface PortalDocumentDetail extends PortalDocument {
  description: string | null;
  versions: { version_number: number; filename: string; size_bytes: number; created_at: string }[];
}

export interface PortalMeeting {
  id: string;
  title: string;
  status: string;
  meeting_type: string;
  start_datetime: string;
  end_datetime: string;
  location: string | null;
  meeting_url: string | null;
}

export interface PortalTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  updated_at: string;
  reply_count: number;
}

export interface PortalTicketReply {
  id: string;
  author_type: string;
  author_name: string;
  body: string;
  created_at: string;
}

export interface PortalTicketDetail extends PortalTicket {
  description: string;
  replies: PortalTicketReply[];
}

export interface PortalAnnouncement {
  id: string;
  title: string;
  body: string;
  published_at: string | null;
  created_at: string;
}

export interface PortalKnowledgeSummary {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  category: string;
  view_count: number;
}

export interface PortalKnowledgeArticle extends PortalKnowledgeSummary {
  body: string;
}

export interface PortalNotification {
  id: string;
  notification_type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface PortalTimelineItem {
  id: string;
  event_type: string;
  title: string;
  detail: string | null;
  occurred_at: string;
  entity_type?: string | null;
  entity_id?: string | null;
}

export interface PortalInvoice {
  id: string;
  invoice_number: string;
  amount: string;
  currency: string;
  status: string;
  due_date: string | null;
  deal_id: string | null;
  document_id: string | null;
}

export interface PortalOrganization {
  tenant_name: string;
  company_id: string | null;
  company_name: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
}

export interface PortalProfileUpdate {
  full_name?: string;
  job_title?: string | null;
  phone?: string | null;
}

export interface PortalMeetingRequest {
  title: string;
  description?: string;
  preferred_start: string;
  preferred_end: string;
  meeting_type?: string;
}

export interface PortalDashboard {
  kpis: PortalKpi[];
  open_deals: PortalDeal[];
  upcoming_meetings: PortalMeeting[];
  recent_documents: PortalDocument[];
  recent_activities: PortalTimelineItem[];
  announcements: PortalAnnouncement[];
  unread_notifications: number;
  pending_signatures: number;
  open_tickets: number;
  outstanding_payments: number;
}
