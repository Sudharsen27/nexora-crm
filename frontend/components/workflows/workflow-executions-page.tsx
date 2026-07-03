"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WidgetError } from "@/components/dashboard/widget-states";
import { usePermissions } from "@/contexts/permissions-context";
import { useWorkflowExecutions } from "@/hooks/use-workflows";
import {
  EXECUTION_STATUS_COLORS,
  cancelWorkflowExecution,
  getWorkflowExecutionLogs,
  retryWorkflowExecution,
  type WorkflowLog,
} from "@/lib/api/workflows";

interface WorkflowExecutionsPageProps {
  tenantSlug: string;
}

export function WorkflowExecutionsPage({ tenantSlug }: WorkflowExecutionsPageProps) {
  const { canWrite } = usePermissions();
  const { items, total, loading, error, refresh } = useWorkflowExecutions(tenantSlug);
  const [logs, setLogs] = useState<WorkflowLog[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const openLogs = async (executionId: string) => {
    setActiveId(executionId);
    const data = await getWorkflowExecutionLogs(tenantSlug, executionId);
    setLogs(data);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/${tenantSlug}/workflows`}
            className="mb-2 inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Workflows
          </Link>
          <h1 className="text-2xl font-bold">Execution history</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Monitor queued, running, completed, and failed workflow runs.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refresh()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {error && <WidgetError title="Executions" message={error} onRetry={() => void refresh()} />}
      {loading && <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Runs ({total})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-[var(--border)] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.workflow_name ?? "Workflow"}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {item.trigger_type.replace(/_/g, " ")} · {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge className={EXECUTION_STATUS_COLORS[item.status] ?? ""}>{item.status}</Badge>
                </div>
                {item.error_message && (
                  <p className="mt-2 text-xs text-red-600">{item.error_message}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => void openLogs(item.id)}>
                    View logs
                  </Button>
                  {canWrite("workflow") && item.status === "queued" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await cancelWorkflowExecution(tenantSlug, item.id);
                        void refresh();
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  {canWrite("workflow") && item.status === "failed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        await retryWorkflowExecution(tenantSlug, item.id);
                        void refresh();
                      }}
                    >
                      Retry
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {!loading && items.length === 0 && (
              <div className="space-y-2 text-sm text-[var(--muted-foreground)]">
                <p>No executions yet.</p>
                <p>
                  <strong className="text-[var(--foreground)]">Manual</strong> workflows only run when
                  you click <strong className="text-[var(--foreground)]">Run now</strong> in the
                  builder. <strong className="text-[var(--foreground)]">Automatic</strong> workflows
                  (e.g. lead created) run when you perform that action in the CRM.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Execution logs</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[520px] space-y-2 overflow-y-auto">
            {!activeId && (
              <p className="text-sm text-[var(--muted-foreground)]">
                Select a run to view step-by-step logs.
              </p>
            )}
            {logs?.map((log) => (
              <div key={log.id} className="rounded border border-[var(--border)] px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium capitalize">{log.level}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="mt-1">{log.message}</p>
                {log.node_key && (
                  <p className="text-xs text-[var(--muted-foreground)]">Node: {log.node_key}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
