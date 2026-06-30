import { apiFetch } from "@/lib/api/client";
import type {
  Deal,
  DealBoard,
  DealPipelineFilters,
  DealStageMeta,
  DealStatistics,
} from "@/types/api";

export type DealInput = {
  title: string;
  description?: string | null;
  stage?: string;
  value?: number | null;
  currency?: string;
  probability?: number | null;
  expected_close_date?: string | null;
  lead_id?: string | null;
  company_id?: string | null;
  contact_id?: string | null;
  assigned_to_id?: string | null;
};

export type DealMoveInput = {
  stage: string;
  position: number;
};

function buildPipelineQuery(filters: DealPipelineFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.owner_id) params.set("owner_id", filters.owner_id);
  if (filters.company_id) params.set("company_id", filters.company_id);
  if (filters.stage) params.set("stage", filters.stage);
  if (filters.close_date_from) params.set("close_date_from", filters.close_date_from);
  if (filters.close_date_to) params.set("close_date_to", filters.close_date_to);
  if (filters.value_min != null) params.set("value_min", String(filters.value_min));
  if (filters.value_max != null) params.set("value_max", String(filters.value_max));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function getDealPipeline(
  slug: string,
  filters: DealPipelineFilters = {},
): Promise<DealBoard> {
  return apiFetch<DealBoard>(`/tenants/${slug}/deals/pipeline${buildPipelineQuery(filters)}`);
}

export async function getDealStatistics(slug: string): Promise<DealStatistics> {
  return apiFetch<DealStatistics>(`/tenants/${slug}/deals/statistics`);
}

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

export async function updateDealStage(slug: string, dealId: string, stage: string): Promise<Deal> {
  return apiFetch<Deal>(`/tenants/${slug}/deals/${dealId}/stage`, {
    method: "PATCH",
    body: JSON.stringify({ stage }),
  });
}

export async function updateDealPosition(slug: string, dealId: string, position: number): Promise<Deal> {
  return apiFetch<Deal>(`/tenants/${slug}/deals/${dealId}/position`, {
    method: "PATCH",
    body: JSON.stringify({ position }),
  });
}

export async function moveDeal(slug: string, dealId: string, data: DealMoveInput): Promise<Deal> {
  return apiFetch<Deal>(`/tenants/${slug}/deals/${dealId}/move`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function duplicateDeal(slug: string, dealId: string): Promise<Deal> {
  return apiFetch<Deal>(`/tenants/${slug}/deals/${dealId}/duplicate`, {
    method: "POST",
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

export const STAGE_BADGE_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
  qualified: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300",
  proposal: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  negotiation: "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300",
  won: "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300",
  lost: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
};

export function formatCurrency(value: string | null, currency: string): string {
  if (!value) return "—";
  const num = Number(value);
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(num);
}

export function formatStageLabel(stage: string): string {
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}
