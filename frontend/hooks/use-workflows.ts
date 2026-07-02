"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createWorkflow,
  deleteWorkflow,
  disableWorkflow,
  duplicateWorkflow,
  getWorkflow,
  getWorkflowMeta,
  listWorkflowExecutions,
  listWorkflows,
  pauseWorkflow,
  publishWorkflow,
  resumeWorkflow,
  updateWorkflow,
  type Workflow,
  type WorkflowExecution,
  type WorkflowMeta,
} from "@/lib/api/workflows";

export function useWorkflows(
  tenantSlug: string,
  filters?: { q?: string; status?: string; page?: number },
) {
  const [items, setItems] = useState<Workflow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filterKey = JSON.stringify(filters ?? {});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listWorkflows(tenantSlug, filters);
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workflows");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, filterKey]);

  useEffect(() => {
    void load();
  }, [load]);

  return useMemo(
    () => ({ items, total, loading, error, refresh: load }),
    [items, total, loading, error, load],
  );
}

export function useWorkflow(tenantSlug: string, workflowId: string | null) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(Boolean(workflowId));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!workflowId) return;
    setLoading(true);
    setError(null);
    try {
      setWorkflow(await getWorkflow(tenantSlug, workflowId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workflow");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, workflowId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { workflow, loading, error, refresh: load, setWorkflow };
}

export function useWorkflowMeta(tenantSlug: string) {
  const [meta, setMeta] = useState<WorkflowMeta | null>(null);
  useEffect(() => {
    void getWorkflowMeta(tenantSlug).then(setMeta).catch(() => setMeta(null));
  }, [tenantSlug]);
  return meta;
}

export function useWorkflowExecutions(
  tenantSlug: string,
  filters?: { workflow_id?: string; page?: number },
) {
  const [items, setItems] = useState<WorkflowExecution[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filterKey = JSON.stringify(filters ?? {});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listWorkflowExecutions(tenantSlug, filters);
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load executions");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, filterKey]);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, total, loading, error, refresh: load };
}

export {
  createWorkflow,
  updateWorkflow,
  deleteWorkflow,
  duplicateWorkflow,
  publishWorkflow,
  pauseWorkflow,
  resumeWorkflow,
  disableWorkflow,
};
