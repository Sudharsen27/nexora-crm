"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { History, Layers, Plus, Search, Trash2, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { WidgetError } from "@/components/dashboard/widget-states";
import { usePermissions } from "@/contexts/permissions-context";
import { createWorkflow, deleteWorkflow, useWorkflows } from "@/hooks/use-workflows";
import { WORKFLOW_STATUS_COLORS } from "@/lib/api/workflows";

interface WorkflowsListPageProps {
  tenantSlug: string;
}

export function WorkflowsListPage({ tenantSlug }: WorkflowsListPageProps) {
  const router = useRouter();
  const { canWrite } = usePermissions();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const { items, total, loading, error, refresh } = useWorkflows(tenantSlug, { q: search });

  const handleCreate = async () => {
    const workflow = await createWorkflow(tenantSlug, {
      name: "Untitled workflow",
      trigger_type: "manual",
      definition: {
        nodes: [
          {
            id: "trigger-1",
            type: "trigger",
            position: { x: 80, y: 120 },
            data: { label: "Trigger", trigger_type: "manual" },
          },
        ],
        edges: [],
      },
    });
    router.push(`/${tenantSlug}/workflows/${workflow.id}`);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Workflow className="h-7 w-7 text-[var(--primary)]" />
            <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Automate CRM actions with visual drag-and-drop workflows.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/${tenantSlug}/workflows/templates`}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-medium"
          >
            <Layers className="mr-2 h-4 w-4" />
            Templates
          </Link>
          <Link
            href={`/${tenantSlug}/workflows/executions`}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-medium"
          >
            <History className="mr-2 h-4 w-4" />
            Execution history
          </Link>
          {canWrite("workflow") && (
            <Button onClick={() => void handleCreate()}>
              <Plus className="mr-2 h-4 w-4" />
              New workflow
            </Button>
          )}
        </div>
      </div>

      <form
        className="flex max-w-md gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q);
        }}
      >
        <Input
          placeholder="Search workflows..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="submit" variant="outline">
          <Search className="h-4 w-4" />
        </Button>
      </form>

      {error && <WidgetError title="Workflows" message={error} onRetry={() => void refresh()} />}
      {loading && <p className="text-sm text-[var(--muted-foreground)]">Loading workflows...</p>}

      {!loading && !error && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((workflow) => (
            <Card key={workflow.id} className="h-full transition hover:border-[var(--primary)] hover:shadow-md">
              <Link href={`/${tenantSlug}/workflows/${workflow.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{workflow.name}</CardTitle>
                    <Badge className={WORKFLOW_STATUS_COLORS[workflow.status] ?? ""}>
                      {workflow.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    {workflow.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-[var(--muted-foreground)]">
                  <p>Trigger: {workflow.trigger_type.replace(/_/g, " ")}</p>
                  <p>Version {workflow.version}</p>
                </CardContent>
              </Link>
              {canWrite("workflow") && (
                <CardContent className="pt-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                    onClick={async (e) => {
                      e.preventDefault();
                      if (!window.confirm(`Delete "${workflow.name}"?`)) return;
                      await deleteWorkflow(tenantSlug, workflow.id);
                      void refresh();
                    }}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Workflow className="mx-auto h-12 w-12 text-[var(--muted-foreground)]" />
            <p className="mt-4 font-medium">No workflows yet</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Create a workflow or start from a template.
            </p>
          </CardContent>
        </Card>
      )}

      {!loading && total > 0 && (
        <p className="text-sm text-[var(--muted-foreground)]">{total} workflow(s)</p>
      )}
    </div>
  );
}
