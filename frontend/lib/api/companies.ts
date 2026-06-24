import { apiFetch } from "@/lib/api/client";
import type {
  Company,
  CompanyFilters,
  CompanyListResponse,
  CompanyMeta,
  Deal,
} from "@/types/api";

export type CompanyInput = {
  company_name: string;
  company_code?: string | null;
  industry?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  annual_revenue?: number | null;
  employee_count?: number | null;
  owner_id?: string | null;
  description?: string | null;
};

export const INDUSTRY_LABELS: Record<string, string> = {
  technology: "Technology",
  finance: "Finance",
  healthcare: "Healthcare",
  manufacturing: "Manufacturing",
  retail: "Retail",
  education: "Education",
  real_estate: "Real Estate",
  consulting: "Consulting",
  media: "Media",
  other: "Other",
};

function buildQuery(filters: CompanyFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.industry) params.set("industry", filters.industry);
  if (filters.owner_id) params.set("owner_id", filters.owner_id);
  if (filters.city) params.set("city", filters.city);
  if (filters.country) params.set("country", filters.country);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.page_size) params.set("page_size", String(filters.page_size));
  if (filters.sort_by) params.set("sort_by", filters.sort_by);
  if (filters.sort_order) params.set("sort_order", filters.sort_order);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getCompanyMeta(slug: string): Promise<CompanyMeta> {
  return apiFetch<CompanyMeta>(`/tenants/${slug}/companies/meta`);
}

export async function listCompanies(
  slug: string,
  filters: CompanyFilters = {},
): Promise<CompanyListResponse> {
  return apiFetch<CompanyListResponse>(`/tenants/${slug}/companies${buildQuery(filters)}`);
}

export async function getCompany(slug: string, companyId: string): Promise<Company> {
  return apiFetch<Company>(`/tenants/${slug}/companies/${companyId}`);
}

export async function createCompany(slug: string, data: CompanyInput): Promise<Company> {
  return apiFetch<Company>(`/tenants/${slug}/companies`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCompany(
  slug: string,
  companyId: string,
  data: Partial<CompanyInput>,
): Promise<Company> {
  return apiFetch<Company>(`/tenants/${slug}/companies/${companyId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteCompany(slug: string, companyId: string): Promise<void> {
  await apiFetch<void>(`/tenants/${slug}/companies/${companyId}`, { method: "DELETE" });
}

export async function listCompanyDeals(slug: string, companyId: string): Promise<Deal[]> {
  return apiFetch<Deal[]>(`/tenants/${slug}/companies/${companyId}/deals`);
}

export function formatCompanyLocation(company: Company): string {
  return [company.city, company.state, company.country].filter(Boolean).join(", ") || "—";
}

export function formatCurrency(value: string | null, currency = "USD"): string {
  if (!value) return "—";
  const amount = Number(value);
  if (Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
