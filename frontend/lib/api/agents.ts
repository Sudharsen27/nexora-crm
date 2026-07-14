import { apiFetch } from "@/lib/api/client";
import type {
  AgentsDashboard,
  AiAgent,
  AiAgentExecution,
  AiAgentMemory,
  AiAgentTask,
  AiInsight,
  AiRecommendation,
  AiUsage,
  KnowledgeSearchResult,
} from "@/types/agents";

const base = (slug: string) => `/tenants/${slug}/agents`;

export function getAgentsDashboard(tenantSlug: string) {
  return apiFetch<AgentsDashboard>(`${base(tenantSlug)}/dashboard`);
}

export function listAgents(tenantSlug: string) {
  return apiFetch<AiAgent[]>(`${base(tenantSlug)}`);
}

export function getAgent(tenantSlug: string, agentId: string) {
  return apiFetch<AiAgent>(`${base(tenantSlug)}/${agentId}`);
}

export function executeAgent(
  tenantSlug: string,
  agentId: string,
  action: string,
  payload: Record<string, unknown> = {},
) {
  return apiFetch<AiAgentExecution>(`${base(tenantSlug)}/${agentId}/execute`, {
    method: "POST",
    body: JSON.stringify({ action, payload }),
  });
}

export function toggleAgent(tenantSlug: string, agentId: string, enabled: boolean) {
  return apiFetch<AiAgent>(`${base(tenantSlug)}/${agentId}/toggle?enabled=${enabled}`, {
    method: "PATCH",
  });
}

export function orchestrateAgents(
  tenantSlug: string,
  payload: { trigger?: string; agent_slugs?: string[]; payload?: Record<string, unknown> } = {},
) {
  return apiFetch<AiAgentExecution[]>(`${base(tenantSlug)}/orchestrate`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listExecutions(tenantSlug: string, agentId?: string) {
  const q = agentId ? `?agent_id=${agentId}` : "";
  return apiFetch<AiAgentExecution[]>(`${base(tenantSlug)}/executions${q}`);
}

export function listRecommendations(tenantSlug: string, status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<AiRecommendation[]>(`${base(tenantSlug)}/recommendations${q}`);
}

export function updateRecommendation(tenantSlug: string, recId: string, status: string) {
  return apiFetch<AiRecommendation>(`${base(tenantSlug)}/recommendations/${recId}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function listInsights(tenantSlug: string) {
  return apiFetch<AiInsight[]>(`${base(tenantSlug)}/insights`);
}

export function markInsightRead(tenantSlug: string, insightId: string) {
  return apiFetch<AiInsight>(`${base(tenantSlug)}/insights/${insightId}/read`, { method: "POST" });
}

export function listMemory(tenantSlug: string, agentId?: string) {
  const q = agentId ? `?agent_id=${agentId}` : "";
  return apiFetch<AiAgentMemory[]>(`${base(tenantSlug)}/memory${q}`);
}

export function listAgentTasks(tenantSlug: string) {
  return apiFetch<AiAgentTask[]>(`${base(tenantSlug)}/tasks`);
}

export function listAgentUsage(tenantSlug: string) {
  return apiFetch<AiUsage[]>(`${base(tenantSlug)}/usage`);
}

export function knowledgeSearch(tenantSlug: string, query: string, sources?: string[]) {
  return apiFetch<KnowledgeSearchResult>(`${base(tenantSlug)}/knowledge/search`, {
    method: "POST",
    body: JSON.stringify({ query, sources }),
  });
}
