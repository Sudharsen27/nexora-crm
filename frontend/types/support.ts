export type TicketStatus =
  | "new"
  | "open"
  | "assigned"
  | "waiting_customer"
  | "in_progress"
  | "escalated"
  | "resolved"
  | "closed";

export type TicketPriority = "critical" | "high" | "medium" | "low" | "urgent";

export interface SupportUserRef {
  id: string;
  full_name: string;
  email: string;
}

export interface SupportContactRef {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
}

export interface SupportCompanyRef {
  id: string;
  company_name: string;
}

export interface SupportTicket {
  id: string;
  tenant_id: string;
  ticket_number: string | null;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  channel: string;
  source: string;
  escalation_level: string;
  assigned_to_id: string | null;
  contact_id: string | null;
  company_id: string | null;
  portal_user_id: string | null;
  created_by_id: string | null;
  sla_policy_id: string | null;
  first_response_at: string | null;
  response_due_at: string | null;
  resolution_due_at: string | null;
  escalation_due_at: string | null;
  sla_breached: boolean;
  sentiment: string | null;
  tags: string[];
  parent_ticket_id: string | null;
  merged_into_id: string | null;
  is_archived: boolean;
  resolved_at: string | null;
  closed_at: string | null;
  last_customer_reply_at: string | null;
  last_agent_reply_at: string | null;
  csat_score: number | null;
  reply_count: number;
  created_at: string;
  updated_at: string;
  assigned_to?: SupportUserRef | null;
  contact?: SupportContactRef | null;
  company?: SupportCompanyRef | null;
}

export interface SupportTicketReply {
  id: string;
  ticket_id: string;
  author_type: string;
  author_name: string | null;
  body: string;
  is_internal: boolean;
  is_ai_generated: boolean;
  staff_user_id: string | null;
  portal_user_id: string | null;
  created_at: string;
}

export interface SupportTicketDetail extends SupportTicket {
  replies: SupportTicketReply[];
}

export interface SupportTicketListResponse {
  items: SupportTicket[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TicketMeta {
  statuses: string[];
  priorities: string[];
  channels: string[];
  sources: string[];
  escalation_levels: string[];
  categories: string[];
}

export interface AgentPerformanceItem {
  user_id: string;
  full_name: string;
  tickets_assigned: number;
  tickets_resolved: number;
  avg_response_minutes: number;
  avg_resolution_minutes: number;
  csat_avg: number;
}

export interface SupportChat {
  id: string;
  tenant_id: string;
  ticket_id: string | null;
  contact_id: string | null;
  company_id: string | null;
  visitor_name: string | null;
  visitor_email: string | null;
  channel: string;
  status: string;
  assigned_to_id: string | null;
  assigned_to?: SupportUserRef | null;
  rating: number | null;
  rating_comment: string | null;
  started_at: string | null;
  ended_at: string | null;
  last_message_at: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface SupportDashboard {
  today_tickets: number;
  open_tickets: number;
  pending_tickets: number;
  resolved_tickets: number;
  overdue_tickets: number;
  sla_violations: number;
  avg_response_minutes: number;
  avg_resolution_minutes: number;
  csat_score: number;
  agent_performance: AgentPerformanceItem[];
  recent_tickets: SupportTicket[];
  recent_chats: SupportChat[];
}

export interface VolumeByDayItem {
  date: string;
  count: number;
}

export interface AgentLeaderboardItem {
  user_id: string;
  full_name: string;
  tickets_resolved: number;
  avg_resolution_minutes: number;
  csat_avg: number;
}

export interface SlaPerformanceItem {
  priority: string;
  met: number;
  breached: number;
  compliance_rate: number;
}

export interface CsatTrendItem {
  date: string;
  score: number;
  count: number;
}

export interface SupportAnalytics {
  volume_by_day: VolumeByDayItem[];
  resolution_rate: number;
  agent_leaderboard: AgentLeaderboardItem[];
  sla_performance: SlaPerformanceItem[];
  csat_trend: CsatTrendItem[];
}

export interface SlaPolicy {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  priority: string;
  channel: string | null;
  response_minutes: number;
  resolution_minutes: number;
  escalation_minutes: number;
  escalate_to_level: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface SlaPolicyListResponse {
  items: SlaPolicy[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface KnowledgeArticle {
  id: string;
  tenant_id: string;
  title: string;
  slug: string;
  summary: string | null;
  body: string;
  category: string;
  category_id: string | null;
  content_type: string;
  status: string;
  tags: string[];
  video_url: string | null;
  version: number;
  is_published: boolean;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  created_by_id: string | null;
  updated_by_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeArticleListResponse {
  items: KnowledgeArticle[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface KnowledgeCategory {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  author_type: string;
  author_id: string | null;
  author_name: string | null;
  message_type: string;
  body: string;
  is_internal: boolean;
  created_at: string;
}

export interface ChatListResponse {
  items: SupportChat[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Feedback {
  id: string;
  tenant_id: string;
  ticket_id: string | null;
  conversation_id: string | null;
  contact_id: string | null;
  agent_id: string | null;
  feedback_type: string;
  score: number;
  comment: string | null;
  source: string;
  created_at: string;
}

export interface FeedbackListResponse {
  items: Feedback[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AiKnowledgeSuggestion {
  id: string;
  title: string;
  slug: string;
  relevance_score: number;
}

export interface AiAssistResponse {
  reply_suggestion: string | null;
  classification: string | null;
  sentiment: string | null;
  summary: string | null;
  priority_suggestion: string | null;
  escalate_recommendation: boolean;
  escalate_reason: string | null;
  knowledge_suggestions: AiKnowledgeSuggestion[];
}

export interface TicketFilters {
  q?: string;
  status?: string;
  priority?: string;
  channel?: string;
  assigned_to_id?: string;
  company_id?: string;
  contact_id?: string;
  category?: string;
  sla_breached?: boolean;
  is_archived?: boolean;
  page?: number;
  page_size?: number;
}

export type TicketCreateInput = {
  subject: string;
  description: string;
  priority?: string;
  category?: string;
  channel?: string;
  contact_id?: string | null;
  company_id?: string | null;
  assigned_to_id?: string | null;
  tags?: string[];
};

export type TicketUpdateInput = Partial<
  Pick<
    SupportTicket,
    | "subject"
    | "description"
    | "status"
    | "priority"
    | "category"
    | "channel"
    | "contact_id"
    | "company_id"
    | "assigned_to_id"
    | "escalation_level"
    | "tags"
    | "sentiment"
  >
>;

export type SlaPolicyInput = {
  name: string;
  description?: string | null;
  priority?: string;
  channel?: string | null;
  response_minutes?: number;
  resolution_minutes?: number;
  escalation_minutes?: number;
  escalate_to_level?: string;
  is_active?: boolean;
  is_default?: boolean;
};

export type KnowledgeArticleInput = {
  title: string;
  body: string;
  summary?: string | null;
  category?: string;
  category_id?: string | null;
  content_type?: string;
  tags?: string[];
  video_url?: string | null;
  status?: string;
};

export type KnowledgeCategoryInput = {
  name: string;
  description?: string | null;
  parent_id?: string | null;
  icon?: string;
  sort_order?: number;
};
