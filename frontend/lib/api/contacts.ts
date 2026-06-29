import { apiFetch } from "@/lib/api/client";
import type { Contact, ContactFilters, ContactListResponse } from "@/types/api";

export type ContactInput = {
  first_name: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  company_id?: string | null;
  job_title?: string | null;
  notes?: string | null;
  lead_id?: string | null;
  assigned_to_id?: string | null;
};

function buildQuery(filters: ContactFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.company) params.set("company", filters.company);
  if (filters.company_id) params.set("company_id", filters.company_id);
  if (filters.assigned_to_id) params.set("assigned_to_id", filters.assigned_to_id);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.page_size) params.set("page_size", String(filters.page_size));
  if (filters.sort_by) params.set("sort_by", filters.sort_by);
  if (filters.sort_order) params.set("sort_order", filters.sort_order);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function listContacts(
  slug: string,
  filters: ContactFilters = {},
): Promise<ContactListResponse> {
  return apiFetch<ContactListResponse>(`/tenants/${slug}/contacts${buildQuery(filters)}`);
}

export async function getContact(slug: string, contactId: string): Promise<Contact> {
  return apiFetch<Contact>(`/tenants/${slug}/contacts/${contactId}`);
}

export async function createContact(slug: string, data: ContactInput): Promise<Contact> {
  return apiFetch<Contact>(`/tenants/${slug}/contacts`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateContact(
  slug: string,
  contactId: string,
  data: ContactInput,
): Promise<Contact> {
  return apiFetch<Contact>(`/tenants/${slug}/contacts/${contactId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteContact(slug: string, contactId: string): Promise<void> {
  await apiFetch<void>(`/tenants/${slug}/contacts/${contactId}`, { method: "DELETE" });
}

export async function convertLeadToContact(slug: string, leadId: string): Promise<Contact> {
  return apiFetch<Contact>(`/tenants/${slug}/contacts/convert-lead/${leadId}`, {
    method: "POST",
  });
}

export function formatContactName(contact: Contact): string {
  return [contact.first_name, contact.last_name].filter(Boolean).join(" ");
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
