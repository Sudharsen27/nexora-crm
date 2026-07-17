import { apiFetch } from "@/lib/api/client";
import type {
  AiAssistResponse,
  ChatListResponse,
  ChatMessage,
  Feedback,
  FeedbackListResponse,
  KnowledgeArticle,
  KnowledgeArticleInput,
  KnowledgeArticleListResponse,
  KnowledgeCategory,
  KnowledgeCategoryInput,
  SlaPolicy,
  SlaPolicyInput,
  SlaPolicyListResponse,
  SupportAnalytics,
  SupportChat,
  SupportDashboard,
  SupportTicketDetail,
  SupportTicketListResponse,
  SupportTicketReply,
  TicketCreateInput,
  TicketFilters,
  TicketMeta,
  TicketUpdateInput,
} from "@/types/support";

const base = (slug: string) => `/tenants/${slug}/support`;

export const TICKET_STATUSES = [
  "new",
  "open",
  "assigned",
  "waiting_customer",
  "in_progress",
  "escalated",
  "resolved",
  "closed",
] as const;

export const TICKET_PRIORITIES = ["critical", "high", "medium", "low", "urgent"] as const;

export const KANBAN_STATUSES = [
  "new",
  "open",
  "assigned",
  "in_progress",
  "waiting_customer",
  "escalated",
  "resolved",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  new: "New",
  open: "Open",
  assigned: "Assigned",
  waiting_customer: "Waiting on Customer",
  in_progress: "In Progress",
  escalated: "Escalated",
  resolved: "Resolved",
  closed: "Closed",
};

export const PRIORITY_LABELS: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  urgent: "Urgent",
};

export const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  high: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  low: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export const STATUS_COLORS: Record<string, string> = {
  new: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  assigned: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  waiting_customer: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  in_progress: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  escalated: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  resolved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  closed: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export const CHANNEL_LABELS: Record<string, string> = {
  email: "Email",
  live_chat: "Live Chat",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  instagram: "Instagram",
  telegram: "Telegram",
  sms: "SMS",
  phone: "Phone",
  portal: "Portal",
  api: "API",
  internal: "Internal",
};

function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function formatTicketNumber(ticket: { ticket_number: string | null; id: string }): string {
  return ticket.ticket_number ?? `#${ticket.id.slice(0, 8)}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isSlaOverdue(ticket: { resolution_due_at: string | null; status: string }): boolean {
  if (!ticket.resolution_due_at) return false;
  if (ticket.status === "resolved" || ticket.status === "closed") return false;
  return new Date(ticket.resolution_due_at) < new Date();
}

// Meta & dashboard

export function getSupportMeta(tenantSlug: string) {
  return apiFetch<TicketMeta>(`${base(tenantSlug)}/meta`);
}

export function getSupportDashboard(tenantSlug: string) {
  return apiFetch<SupportDashboard>(`${base(tenantSlug)}/dashboard`);
}

export function getSupportAnalytics(tenantSlug: string, days = 30) {
  return apiFetch<SupportAnalytics>(`${base(tenantSlug)}/analytics${buildQuery({ days })}`);
}

// Tickets

export function listTickets(tenantSlug: string, filters: TicketFilters = {}) {
  return apiFetch<SupportTicketListResponse>(
    `${base(tenantSlug)}/tickets${buildQuery({
      q: filters.q,
      status: filters.status,
      priority: filters.priority,
      channel: filters.channel,
      assigned_to_id: filters.assigned_to_id,
      company_id: filters.company_id,
      contact_id: filters.contact_id,
      category: filters.category,
      sla_breached: filters.sla_breached,
      is_archived: filters.is_archived,
      page: filters.page,
      page_size: filters.page_size,
    })}`,
  );
}

export function getTicket(tenantSlug: string, ticketId: string) {
  return apiFetch<SupportTicketDetail>(`${base(tenantSlug)}/tickets/${ticketId}`);
}

export function createTicket(tenantSlug: string, payload: TicketCreateInput) {
  return apiFetch<SupportTicketDetail>(`${base(tenantSlug)}/tickets`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateTicket(tenantSlug: string, ticketId: string, payload: TicketUpdateInput) {
  return apiFetch<SupportTicketDetail>(`${base(tenantSlug)}/tickets/${ticketId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteTicket(tenantSlug: string, ticketId: string, hard = false) {
  return apiFetch<void>(`${base(tenantSlug)}/tickets/${ticketId}${buildQuery({ hard })}`, {
    method: "DELETE",
  });
}

export function assignTicket(tenantSlug: string, ticketId: string, assignedToId: string) {
  return apiFetch<SupportTicketDetail>(`${base(tenantSlug)}/tickets/${ticketId}/assign`, {
    method: "POST",
    body: JSON.stringify({ assigned_to_id: assignedToId }),
  });
}

export function transferTicket(tenantSlug: string, ticketId: string, assignedToId: string) {
  return apiFetch<SupportTicketDetail>(`${base(tenantSlug)}/tickets/${ticketId}/transfer`, {
    method: "POST",
    body: JSON.stringify({ assigned_to_id: assignedToId }),
  });
}

export function escalateTicket(
  tenantSlug: string,
  ticketId: string,
  payload: { escalation_level?: string; note?: string | null } = {},
) {
  return apiFetch<SupportTicketDetail>(`${base(tenantSlug)}/tickets/${ticketId}/escalate`, {
    method: "POST",
    body: JSON.stringify({ escalation_level: payload.escalation_level ?? "level_2", note: payload.note }),
  });
}

export function mergeTickets(tenantSlug: string, ticketId: string, sourceTicketId: string) {
  return apiFetch<SupportTicketDetail>(`${base(tenantSlug)}/tickets/${ticketId}/merge`, {
    method: "POST",
    body: JSON.stringify({ source_ticket_id: sourceTicketId }),
  });
}

export function splitTicket(
  tenantSlug: string,
  ticketId: string,
  payload: { subject: string; description: string },
) {
  return apiFetch<SupportTicketDetail>(`${base(tenantSlug)}/tickets/${ticketId}/split`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function closeTicket(tenantSlug: string, ticketId: string) {
  return apiFetch<SupportTicketDetail>(`${base(tenantSlug)}/tickets/${ticketId}/close`, {
    method: "POST",
  });
}

export function reopenTicket(tenantSlug: string, ticketId: string) {
  return apiFetch<SupportTicketDetail>(`${base(tenantSlug)}/tickets/${ticketId}/reopen`, {
    method: "POST",
  });
}

export function archiveTicket(tenantSlug: string, ticketId: string) {
  return apiFetch<SupportTicketDetail>(`${base(tenantSlug)}/tickets/${ticketId}/archive`, {
    method: "POST",
  });
}

export function bulkTicketAction(
  tenantSlug: string,
  payload: {
    ticket_ids: string[];
    action: "assign" | "close" | "archive" | "escalate" | "priority";
    assigned_to_id?: string;
    priority?: string;
    escalation_level?: string;
  },
) {
  return apiFetch<{ updated: number }>(`${base(tenantSlug)}/tickets/bulk`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Replies

export function listReplies(tenantSlug: string, ticketId: string) {
  return apiFetch<SupportTicketReply[]>(`${base(tenantSlug)}/tickets/${ticketId}/replies`);
}

export function addReply(
  tenantSlug: string,
  ticketId: string,
  payload: { body: string; is_internal?: boolean },
) {
  return apiFetch<SupportTicketReply>(`${base(tenantSlug)}/tickets/${ticketId}/replies`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function aiAssist(tenantSlug: string, ticketId: string, assistType: string) {
  return apiFetch<AiAssistResponse>(`${base(tenantSlug)}/tickets/${ticketId}/ai-assist`, {
    method: "POST",
    body: JSON.stringify({ assist_type: assistType }),
  });
}

// SLA

export function listSlaPolicies(tenantSlug: string) {
  return apiFetch<SlaPolicyListResponse>(`${base(tenantSlug)}/sla`);
}

export function createSlaPolicy(tenantSlug: string, payload: SlaPolicyInput) {
  return apiFetch<SlaPolicy>(`${base(tenantSlug)}/sla`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSlaPolicy(tenantSlug: string, policyId: string, payload: Partial<SlaPolicyInput>) {
  return apiFetch<SlaPolicy>(`${base(tenantSlug)}/sla/${policyId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteSlaPolicy(tenantSlug: string, policyId: string) {
  return apiFetch<void>(`${base(tenantSlug)}/sla/${policyId}`, { method: "DELETE" });
}

export function checkEscalations(tenantSlug: string) {
  return apiFetch<{ escalated: number; overdue: number }>(`${base(tenantSlug)}/sla/check-escalations`, {
    method: "POST",
  });
}

// Knowledge

export function listKnowledge(
  tenantSlug: string,
  filters: { q?: string; status?: string; page?: number; page_size?: number } = {},
) {
  return apiFetch<KnowledgeArticleListResponse>(
    `${base(tenantSlug)}/knowledge${buildQuery({
      q: filters.q,
      status: filters.status,
      page: filters.page,
      page_size: filters.page_size,
    })}`,
  );
}

export function getKnowledge(tenantSlug: string, articleId: string) {
  return apiFetch<KnowledgeArticle>(`${base(tenantSlug)}/knowledge/${articleId}`);
}

export function createKnowledge(tenantSlug: string, payload: KnowledgeArticleInput) {
  return apiFetch<KnowledgeArticle>(`${base(tenantSlug)}/knowledge`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateKnowledge(
  tenantSlug: string,
  articleId: string,
  payload: Partial<KnowledgeArticleInput> & { change_note?: string },
) {
  return apiFetch<KnowledgeArticle>(`${base(tenantSlug)}/knowledge/${articleId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteKnowledge(tenantSlug: string, articleId: string) {
  return apiFetch<void>(`${base(tenantSlug)}/knowledge/${articleId}`, { method: "DELETE" });
}

export function listKnowledgeCategories(tenantSlug: string) {
  return apiFetch<KnowledgeCategory[]>(`${base(tenantSlug)}/knowledge/categories`);
}

export function createKnowledgeCategory(tenantSlug: string, payload: KnowledgeCategoryInput) {
  return apiFetch<KnowledgeCategory>(`${base(tenantSlug)}/knowledge/categories`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Chat

export function listChats(
  tenantSlug: string,
  filters: { status?: string; page?: number; page_size?: number } = {},
) {
  return apiFetch<ChatListResponse>(
    `${base(tenantSlug)}/chats${buildQuery({
      status: filters.status,
      page: filters.page,
      page_size: filters.page_size,
    })}`,
  );
}

export function getChat(tenantSlug: string, conversationId: string) {
  return apiFetch<SupportChat>(`${base(tenantSlug)}/chats/${conversationId}`);
}

export function startChat(
  tenantSlug: string,
  payload: {
    contact_id?: string | null;
    company_id?: string | null;
    visitor_name?: string | null;
    visitor_email?: string | null;
    channel?: string;
    ticket_id?: string | null;
  } = {},
) {
  return apiFetch<SupportChat>(`${base(tenantSlug)}/chats`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function sendChatMessage(
  tenantSlug: string,
  conversationId: string,
  payload: { body: string; message_type?: string; is_internal?: boolean },
) {
  return apiFetch<ChatMessage>(`${base(tenantSlug)}/chats/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function transferChat(tenantSlug: string, conversationId: string, assignedToId: string) {
  return apiFetch<SupportChat>(`${base(tenantSlug)}/chats/${conversationId}/transfer`, {
    method: "POST",
    body: JSON.stringify({ assigned_to_id: assignedToId }),
  });
}

export function resolveChat(tenantSlug: string, conversationId: string) {
  return apiFetch<SupportChat>(`${base(tenantSlug)}/chats/${conversationId}/resolve`, {
    method: "POST",
  });
}

export function rateChat(tenantSlug: string, conversationId: string, rating: number, comment?: string) {
  return apiFetch<SupportChat>(
    `${base(tenantSlug)}/chats/${conversationId}/rate${buildQuery({ rating, comment })}`,
    { method: "POST" },
  );
}

// Feedback

export function listFeedback(tenantSlug: string, page = 1, pageSize = 20) {
  return apiFetch<FeedbackListResponse>(
    `${base(tenantSlug)}/feedback${buildQuery({ page, page_size: pageSize })}`,
  );
}

export function createFeedback(
  tenantSlug: string,
  payload: {
    ticket_id?: string | null;
    conversation_id?: string | null;
    contact_id?: string | null;
    agent_id?: string | null;
    feedback_type?: string;
    score: number;
    comment?: string | null;
    source?: string;
  },
) {
  return apiFetch<Feedback>(`${base(tenantSlug)}/feedback`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
