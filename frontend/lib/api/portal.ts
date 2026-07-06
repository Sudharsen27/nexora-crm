import type {
  PortalDashboard,
  PortalDeal,
  PortalDealDetail,
  PortalDocument,
  PortalDocumentDetail,
  PortalInvoice,
  PortalKnowledgeArticle,
  PortalKnowledgeSummary,
  PortalMeeting,
  PortalMeetingRequest,
  PortalNotification,
  PortalOrganization,
  PortalProfileUpdate,
  PortalTicket,
  PortalTicketDetail,
  PortalTimelineItem,
  PortalUser,
} from "@/types/portal";
import { API_BASE } from "@/lib/api/client";
import { clearPortalTokens, getPortalAccessToken, getPortalRefreshToken, setPortalTokens } from "@/lib/auth/portal-tokens";

async function portalFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getPortalAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
    credentials: "include",
  });

  if (res.status === 401 && getPortalRefreshToken()) {
    const refreshed = await refreshPortalSession();
    if (refreshed) return portalFetch<T>(path, options);
  }

  if (!res.ok) {
    let message = "Request failed";
    try {
      const err = (await res.json()) as { detail?: string };
      if (err.detail) message = err.detail;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function portalLogin(tenantSlug: string, email: string, password: string) {
  const res = await fetch(`${API_BASE}/portal/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenant_slug: tenantSlug, email, password }),
  });
  if (!res.ok) {
    const err = (await res.json()) as { detail?: string };
    throw new Error(err.detail ?? "Login failed");
  }
  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    tenant_slug: string;
  };
  setPortalTokens(data.access_token, data.refresh_token ?? "", data.tenant_slug);
  return data;
}

export async function refreshPortalSession(): Promise<boolean> {
  const refresh = getPortalRefreshToken();
  if (!refresh) return false;
  const res = await fetch(`${API_BASE}/portal/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) {
    clearPortalTokens();
    return false;
  }
  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    tenant_slug: string;
  };
  setPortalTokens(data.access_token, data.refresh_token ?? refresh, data.tenant_slug);
  return true;
}

export function portalLogout() {
  clearPortalTokens();
}

export const getPortalProfile = (slug: string) =>
  portalFetch<PortalUser>(`/portal/${slug}/profile`);

export const updatePortalProfile = (slug: string, body: PortalProfileUpdate) =>
  portalFetch<PortalUser>(`/portal/${slug}/profile`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });

export const getPortalOrganization = (slug: string) =>
  portalFetch<PortalOrganization>(`/portal/${slug}/organization`);

export const getPortalDashboard = (slug: string) =>
  portalFetch<PortalDashboard>(`/portal/${slug}/dashboard`);

export const getPortalDeals = (slug: string) =>
  portalFetch<PortalDeal[]>(`/portal/${slug}/deals`);

export const getPortalDeal = (slug: string, id: string) =>
  portalFetch<PortalDealDetail>(`/portal/${slug}/deals/${id}`);

export const getPortalDocuments = (slug: string) =>
  portalFetch<PortalDocument[]>(`/portal/${slug}/documents`);

export const getPortalDocument = (slug: string, id: string) =>
  portalFetch<PortalDocumentDetail>(`/portal/${slug}/documents/${id}`);

export async function uploadPortalDocument(slug: string, file: File, dealId?: string) {
  const form = new FormData();
  form.append("file", file);
  if (dealId) form.append("deal_id", dealId);
  return portalFetch<PortalDocument>(`/portal/${slug}/documents/upload`, {
    method: "POST",
    body: form,
  });
}

export async function downloadPortalDocument(slug: string, id: string, filename: string) {
  const token = getPortalAccessToken();
  const res = await fetch(`${API_BASE}/portal/${slug}/documents/${id}/download`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error("Download failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const getPortalMeetings = (slug: string) =>
  portalFetch<PortalMeeting[]>(`/portal/${slug}/meetings`);

export const requestPortalMeeting = (slug: string, body: PortalMeetingRequest) =>
  portalFetch<PortalMeeting>(`/portal/${slug}/meetings/request`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const getPortalTickets = (slug: string) =>
  portalFetch<PortalTicket[]>(`/portal/${slug}/tickets`);

export const getPortalTicket = (slug: string, id: string) =>
  portalFetch<PortalTicketDetail>(`/portal/${slug}/tickets/${id}`);

export const createPortalTicket = (
  slug: string,
  body: { subject: string; description: string; priority?: string; category?: string },
) =>
  portalFetch<PortalTicketDetail>(`/portal/${slug}/tickets`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const replyPortalTicket = (slug: string, id: string, body: string) =>
  portalFetch(`/portal/${slug}/tickets/${id}/replies`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });

export const getPortalKnowledge = (slug: string, q?: string) =>
  portalFetch<PortalKnowledgeSummary[]>(
    `/portal/${slug}/knowledge${q ? `?q=${encodeURIComponent(q)}` : ""}`,
  );

export const getPortalKnowledgeArticle = (slug: string, articleSlug: string) =>
  portalFetch<PortalKnowledgeArticle>(`/portal/${slug}/knowledge/${articleSlug}`);

export const getPortalNotifications = (slug: string) =>
  portalFetch<PortalNotification[]>(`/portal/${slug}/notifications`);

export const markPortalNotificationRead = (slug: string, id: string) =>
  portalFetch<{ ok: boolean }>(`/portal/${slug}/notifications/${id}/read`, {
    method: "POST",
  });

export const getPortalTimeline = (slug: string) =>
  portalFetch<PortalTimelineItem[]>(`/portal/${slug}/timeline`);

export const getPortalInvoices = (slug: string) =>
  portalFetch<PortalInvoice[]>(`/portal/${slug}/invoices`);

export async function* streamPortalAi(
  slug: string,
  messages: { role: string; content: string }[],
): AsyncGenerator<string> {
  const token = getPortalAccessToken();
  const res = await fetch(`${API_BASE}/portal/${slug}/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok) throw new Error("AI request failed");
  const reader = res.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data) as { content?: string };
        if (parsed.content) yield parsed.content;
      } catch {
        /* ignore */
      }
    }
  }
}
