import { apiFetch } from "@/lib/api/client";

export interface WorkflowDefinition {
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    label?: string | null;
  }>;
}

export interface Workflow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: "draft" | "published" | "paused" | "disabled";
  trigger_type: string;
  definition: WorkflowDefinition;
  version: number;
  published_version: number | null;
  is_template: boolean;
  template_slug: string | null;
  published_at: string | null;
  created_by_id: string | null;
  updated_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  tenant_id: string;
  version: number;
  trigger_type: string;
  trigger_payload: Record<string, unknown>;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  entity_type: string | null;
  entity_id: string | null;
  error_message: string | null;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  workflow_name?: string | null;
}

export interface WorkflowLog {
  id: string;
  execution_id: string;
  workflow_id: string;
  level: string;
  message: string;
  node_key: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
}

export interface WorkflowMeta {
  triggers: string[];
  actions: string[];
  conditions: string[];
  statuses: string[];
  execution_statuses: string[];
}

export interface WorkflowTemplate {
  template_slug: string;
  name: string;
  description: string;
  trigger_type: string;
  definition: WorkflowDefinition;
}

export async function getWorkflowMeta(tenantSlug: string): Promise<WorkflowMeta> {
  return apiFetch<WorkflowMeta>(`/tenants/${tenantSlug}/workflows/meta`);
}

export async function listWorkflows(
  tenantSlug: string,
  params?: { q?: string; status?: string; page?: number; page_size?: number },
): Promise<{ items: Workflow[]; total: number; page: number; page_size: number }> {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.status) search.set("status", params.status);
  if (params?.page) search.set("page", String(params.page));
  if (params?.page_size) search.set("page_size", String(params.page_size));
  const qs = search.toString();
  return apiFetch(`/tenants/${tenantSlug}/workflows${qs ? `?${qs}` : ""}`);
}

export async function getWorkflow(tenantSlug: string, id: string): Promise<Workflow> {
  return apiFetch<Workflow>(`/tenants/${tenantSlug}/workflows/${id}`);
}

export async function createWorkflow(
  tenantSlug: string,
  data: {
    name: string;
    description?: string;
    trigger_type: string;
    definition?: WorkflowDefinition;
  },
): Promise<Workflow> {
  return apiFetch<Workflow>(`/tenants/${tenantSlug}/workflows`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateWorkflow(
  tenantSlug: string,
  id: string,
  data: Partial<{
    name: string;
    description: string;
    trigger_type: string;
    definition: WorkflowDefinition;
    status: string;
  }>,
): Promise<Workflow> {
  return apiFetch<Workflow>(`/tenants/${tenantSlug}/workflows/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteWorkflow(tenantSlug: string, id: string): Promise<void> {
  await apiFetch(`/tenants/${tenantSlug}/workflows/${id}`, { method: "DELETE" });
}

export async function duplicateWorkflow(tenantSlug: string, id: string, name?: string): Promise<Workflow> {
  return apiFetch<Workflow>(`/tenants/${tenantSlug}/workflows/${id}/duplicate`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function publishWorkflow(tenantSlug: string, id: string): Promise<Workflow> {
  return apiFetch<Workflow>(`/tenants/${tenantSlug}/workflows/${id}/publish`, { method: "POST" });
}

export async function pauseWorkflow(tenantSlug: string, id: string): Promise<Workflow> {
  return apiFetch<Workflow>(`/tenants/${tenantSlug}/workflows/${id}/pause`, { method: "POST" });
}

export async function resumeWorkflow(tenantSlug: string, id: string): Promise<Workflow> {
  return apiFetch<Workflow>(`/tenants/${tenantSlug}/workflows/${id}/resume`, { method: "POST" });
}

export async function disableWorkflow(tenantSlug: string, id: string): Promise<Workflow> {
  return apiFetch<Workflow>(`/tenants/${tenantSlug}/workflows/${id}/disable`, { method: "POST" });
}

export async function executeWorkflow(
  tenantSlug: string,
  id: string,
  payload?: Record<string, unknown>,
): Promise<WorkflowExecution> {
  return apiFetch<WorkflowExecution>(`/tenants/${tenantSlug}/workflows/${id}/execute`, {
    method: "POST",
    body: JSON.stringify({ payload: payload ?? {} }),
  });
}

export async function listWorkflowExecutions(
  tenantSlug: string,
  params?: { workflow_id?: string; page?: number; page_size?: number },
): Promise<{ items: WorkflowExecution[]; total: number; page: number; page_size: number }> {
  const path = params?.workflow_id
    ? `/tenants/${tenantSlug}/workflows/${params.workflow_id}/executions`
    : `/tenants/${tenantSlug}/workflows/executions`;
  const search = new URLSearchParams();
  if (params?.page) search.set("page", String(params.page));
  if (params?.page_size) search.set("page_size", String(params.page_size));
  const qs = search.toString();
  return apiFetch(`${path}${qs ? `?${qs}` : ""}`);
}

export async function getWorkflowExecutionLogs(
  tenantSlug: string,
  executionId: string,
): Promise<WorkflowLog[]> {
  return apiFetch<WorkflowLog[]>(`/tenants/${tenantSlug}/workflows/executions/${executionId}/logs`);
}

export async function retryWorkflowExecution(
  tenantSlug: string,
  executionId: string,
): Promise<WorkflowExecution> {
  return apiFetch<WorkflowExecution>(
    `/tenants/${tenantSlug}/workflows/executions/${executionId}/retry`,
    { method: "POST" },
  );
}

export async function listWorkflowTemplates(tenantSlug: string): Promise<WorkflowTemplate[]> {
  return apiFetch<WorkflowTemplate[]>(`/tenants/${tenantSlug}/workflows/template-library`);
}

export async function createWorkflowFromTemplate(
  tenantSlug: string,
  templateSlug: string,
): Promise<Workflow> {
  return apiFetch<Workflow>(`/tenants/${tenantSlug}/workflows/from-template/${templateSlug}`, {
    method: "POST",
  });
}

export const WORKFLOW_STATUS_COLORS: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  paused: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  disabled: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export const EXECUTION_STATUS_COLORS: Record<string, string> = {
  queued: "bg-zinc-100 text-zinc-700",
  running: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-amber-100 text-amber-800",
};
