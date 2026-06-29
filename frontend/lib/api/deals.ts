import { apiFetch } from "@/lib/api/client";
import type { Deal, DealBoard, DealStageMeta } from "@/types/api";

export type DealInput = {
  title: string;
  description?: string | null;
  stage?: string;
  value?: number | null;
  currency?: string;
  expected_close_date?: string | null;
  lead_id?: string | null;
  company_id?: string | null;
  assigned_to_id?: string | null;
};

export type DealMoveInput = {
  stage: string;
  position: number;
};

export async function getDealBoard(slug: string): Promise<DealBoard> {
  return apiFetch<DealBoard>(`/tenants/${slug}/deals/board`);
}

export async function getDealMeta(slug: string): Promise<{ stages: DealStageMeta[] }> {
  return apiFetch<{ stages: DealStageMeta[] }>(`/tenants/${slug}/deals/meta`);
}

export async function getDeal(slug: string, dealId: string): Promise<Deal> {
  return apiFetch<Deal>(`/tenants/${slug}/deals/${dealId}`);
}

export async function createDeal(slug: string, data: DealInput): Promise<Deal> {
  return apiFetch<Deal>(`/tenants/${slug}/deals`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateDeal(slug: string, dealId: string, data: Partial<DealInput>): Promise<Deal> {
  return apiFetch<Deal>(`/tenants/${slug}/deals/${dealId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function moveDeal(slug: string, dealId: string, data: DealMoveInput): Promise<Deal> {
  return apiFetch<Deal>(`/tenants/${slug}/deals/${dealId}/move`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteDeal(slug: string, dealId: string): Promise<void> {
  await apiFetch<void>(`/tenants/${slug}/deals/${dealId}`, { method: "DELETE" });
}

export const STAGE_COLORS: Record<string, string> = {
  new: "border-t-blue-500",
  qualified: "border-t-cyan-500",
  proposal: "border-t-amber-500",
  negotiation: "border-t-orange-500",
  won: "border-t-green-500",
  lost: "border-t-red-500",
};

export function formatCurrency(value: string | null, currency: string): string {
  if (!value) return "—";
  const num = Number(value);
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(num);
}
