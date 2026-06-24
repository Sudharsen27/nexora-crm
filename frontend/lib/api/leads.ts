import { apiFetch } from "@/lib/api/client";
import type { Contact, Deal, Lead, LeadFilters, LeadListResponse, LeadMeta } from "@/types/api";

export type LeadInput = {
  first_name: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  job_title?: string | null;
  status?: string;
  source?: string | null;
  estimated_value?: number | null;
  notes?: string | null;
  assigned_to_id?: string | null;
};

function buildQuery(filters: LeadFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.source) params.set("source", filters.source);
  if (filters.assigned_to_id) params.set("assigned_to_id", filters.assigned_to_id);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.page_size) params.set("page_size", String(filters.page_size));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getLeadMeta(slug: string): Promise<LeadMeta> {
  return apiFetch<LeadMeta>(`/tenants/${slug}/leads/meta`);
}

export async function listLeads(slug: string, filters: LeadFilters = {}): Promise<LeadListResponse> {
  return apiFetch<LeadListResponse>(`/tenants/${slug}/leads${buildQuery(filters)}`);
}

export async function getLead(slug: string, leadId: string): Promise<Lead> {
  return apiFetch<Lead>(`/tenants/${slug}/leads/${leadId}`);
}

export async function createLead(slug: string, data: LeadInput): Promise<Lead> {
  return apiFetch<Lead>(`/tenants/${slug}/leads`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateLead(slug: string, leadId: string, data: Partial<LeadInput>): Promise<Lead> {
  return apiFetch<Lead>(`/tenants/${slug}/leads/${leadId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteLead(slug: string, leadId: string): Promise<void> {
  await apiFetch<void>(`/tenants/${slug}/leads/${leadId}`, { method: "DELETE" });
}

export async function listLeadDeals(slug: string, leadId: string): Promise<Deal[]> {
  return apiFetch<Deal[]>(`/tenants/${slug}/leads/${leadId}/deals`);
}

export async function getLeadContact(slug: string, leadId: string): Promise<Contact> {
  return apiFetch<Contact>(`/tenants/${slug}/leads/${leadId}/contact`);
}

export function formatLeadName(lead: Lead): string {
  return [lead.first_name, lead.last_name].filter(Boolean).join(" ");
}

export const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  unqualified: "Unqualified",
  converted: "Converted",
};

export const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  contacted: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  qualified: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  unqualified: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  converted: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

export const SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  referral: "Referral",
  cold_call: "Cold Call",
  email: "Email",
  event: "Event",
  social: "Social",
  other: "Other",
};

/** Derived lead score (0–100) from status and profile completeness. */
export function getLeadScore(lead: Lead): number {
  const statusBase: Record<string, number> = {
    new: 25,
    contacted: 45,
    qualified: 75,
    unqualified: 15,
    converted: 100,
  };
  let score = statusBase[lead.status] ?? 20;
  if (lead.email) score += 8;
  if (lead.phone) score += 8;
  if (lead.company) score += 7;
  if (lead.job_title) score += 5;
  if (lead.estimated_value) score += 7;
  return Math.min(100, score);
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatCurrency(value: string | null): string {
  if (!value) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}
