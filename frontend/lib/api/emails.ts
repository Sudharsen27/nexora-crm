import { apiFetch, API_BASE } from "@/lib/api/client";
import { getAccessToken } from "@/lib/auth/tokens";
import type {
  Email,
  EmailAttachment,
  EmailFilters,
  EmailInput,
  EmailListResponse,
  EmailScheduleInput,
  EmailSendInput,
  EmailStatistics,
  EmailTemplate,
  EmailUserSettings,
} from "@/types/email";

function buildQuery(filters: EmailFilters = {}): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const FOLDER_LABELS: Record<string, string> = {
  inbox: "Inbox",
  sent: "Sent",
  drafts: "Drafts",
  scheduled: "Scheduled",
  starred: "Starred",
  archive: "Archive",
  trash: "Trash",
};

export const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  sales: "Sales",
  support: "Support",
  follow_up: "Follow Up",
  welcome: "Welcome",
  reminder: "Reminder",
  marketing: "Marketing",
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  sending: "Sending",
  sent: "Sent",
  failed: "Failed",
  received: "Received",
};

export function emailSenderDisplay(email: Email): string {
  return email.from_name || email.sender?.full_name || email.from_email || "Unknown sender";
}

export function emailInitials(email: Email): string {
  const name = emailSenderDisplay(email);
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const addr = email.from_email ?? email.recipients[0]?.email_address ?? "?";
  return addr.slice(0, 2).toUpperCase();
}

export function formatEmailDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function recipientSummary(email: Email): string {
  if (!email.recipients.length) return email.from_email ?? "—";
  return email.recipients
    .filter((r) => r.recipient_type === "to")
    .map((r) => r.display_name || r.email_address)
    .join(", ") || email.recipients[0]?.email_address || "—";
}

export async function listEmails(tenantSlug: string, filters: EmailFilters = {}): Promise<EmailListResponse> {
  return apiFetch<EmailListResponse>(`/tenants/${tenantSlug}/emails${buildQuery(filters)}`);
}

export async function getEmail(tenantSlug: string, emailId: string): Promise<Email> {
  return apiFetch<Email>(`/tenants/${tenantSlug}/emails/${emailId}`);
}

export async function createDraft(tenantSlug: string, data: EmailInput): Promise<Email> {
  return apiFetch<Email>(`/tenants/${tenantSlug}/emails/draft`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateEmail(tenantSlug: string, emailId: string, data: Partial<EmailInput>): Promise<Email> {
  return apiFetch<Email>(`/tenants/${tenantSlug}/emails/${emailId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function sendEmail(tenantSlug: string, data: EmailSendInput): Promise<Email> {
  return apiFetch<Email>(`/tenants/${tenantSlug}/emails/send`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function scheduleEmail(tenantSlug: string, data: EmailScheduleInput): Promise<Email> {
  return apiFetch<Email>(`/tenants/${tenantSlug}/emails/schedule`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function replyEmail(
  tenantSlug: string,
  emailId: string,
  data: { body_html?: string; body_text?: string; reply_all?: boolean; include_signature?: boolean },
): Promise<Email> {
  return apiFetch<Email>(`/tenants/${tenantSlug}/emails/${emailId}/reply`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function forwardEmail(
  tenantSlug: string,
  emailId: string,
  data: { body_html?: string; body_text?: string; recipients: EmailInput["recipients"]; include_signature?: boolean },
): Promise<Email> {
  return apiFetch<Email>(`/tenants/${tenantSlug}/emails/${emailId}/forward`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function starEmail(tenantSlug: string, emailId: string, starred = true): Promise<Email> {
  return apiFetch<Email>(`/tenants/${tenantSlug}/emails/${emailId}/star?starred=${starred}`, { method: "PATCH" });
}

export async function archiveEmail(tenantSlug: string, emailId: string, archived = true): Promise<Email> {
  return apiFetch<Email>(`/tenants/${tenantSlug}/emails/${emailId}/archive?archived=${archived}`, { method: "PATCH" });
}

export async function markEmailRead(tenantSlug: string, emailId: string, read = true): Promise<Email> {
  return apiFetch<Email>(`/tenants/${tenantSlug}/emails/${emailId}/read?read=${read}`, { method: "PATCH" });
}

export async function trashEmail(tenantSlug: string, emailId: string): Promise<void> {
  await apiFetch(`/tenants/${tenantSlug}/emails/${emailId}`, { method: "DELETE" });
}

export async function deleteEmailPermanent(tenantSlug: string, emailId: string): Promise<void> {
  await apiFetch(`/tenants/${tenantSlug}/emails/${emailId}?permanent=true`, { method: "DELETE" });
}

export async function getEmailStatistics(tenantSlug: string): Promise<EmailStatistics> {
  return apiFetch<EmailStatistics>(`/tenants/${tenantSlug}/emails/statistics`);
}

export async function listEmailTemplates(tenantSlug: string, category?: string): Promise<{ items: EmailTemplate[]; total: number }> {
  const qs = category ? `?category=${category}` : "";
  return apiFetch(`/tenants/${tenantSlug}/emails/templates${qs}`);
}

export async function createEmailTemplate(
  tenantSlug: string,
  data: { name: string; category: string; subject: string; body_html: string; body_text?: string; variables?: string[] },
): Promise<EmailTemplate> {
  return apiFetch<EmailTemplate>(`/tenants/${tenantSlug}/emails/templates`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateEmailTemplate(
  tenantSlug: string,
  templateId: string,
  data: Partial<{ name: string; category: string; subject: string; body_html: string; body_text: string; variables: string[] }>,
): Promise<EmailTemplate> {
  return apiFetch<EmailTemplate>(`/tenants/${tenantSlug}/emails/templates/${templateId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteEmailTemplate(tenantSlug: string, templateId: string): Promise<void> {
  await apiFetch(`/tenants/${tenantSlug}/emails/templates/${templateId}`, { method: "DELETE" });
}

export async function duplicateEmailTemplate(tenantSlug: string, templateId: string): Promise<EmailTemplate> {
  return apiFetch<EmailTemplate>(`/tenants/${tenantSlug}/emails/templates/${templateId}/duplicate`, { method: "POST" });
}

export async function getEmailSettings(tenantSlug: string): Promise<EmailUserSettings> {
  return apiFetch<EmailUserSettings>(`/tenants/${tenantSlug}/emails/settings`);
}

export async function updateEmailSettings(tenantSlug: string, data: EmailUserSettings): Promise<EmailUserSettings> {
  return apiFetch<EmailUserSettings>(`/tenants/${tenantSlug}/emails/settings`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function uploadEmailAttachment(tenantSlug: string, emailId: string, file: File): Promise<EmailAttachment> {
  const form = new FormData();
  form.append("file", file);
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}/tenants/${tenantSlug}/emails/${emailId}/attachments`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: "include",
    body: form,
  });
  if (!res.ok) {
    let message = "Failed to upload attachment";
    try {
      const err = (await res.json()) as { detail?: string };
      if (err.detail) message = err.detail;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json() as Promise<EmailAttachment>;
}
