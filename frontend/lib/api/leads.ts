import { apiFetch } from "@/lib/api/client";
import type { Lead, LeadFilters, LeadListResponse, LeadMeta } from "@/types/api";

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

export const SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  referral: "Referral",
  cold_call: "Cold Call",
  email: "Email",
  event: "Event",
  social: "Social",
  other: "Other",
};
