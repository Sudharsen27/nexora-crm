"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { WidgetError } from "@/components/dashboard/widget-states";
import { WorkflowBuilder } from "@/components/workflows/workflow-builder";
import { usePermissions } from "@/contexts/permissions-context";
import {
  disableWorkflow,
  duplicateWorkflow,
  pauseWorkflow,
  publishWorkflow,
  resumeWorkflow,
  updateWorkflow,
  useWorkflow,
  useWorkflowMeta,
} from "@/hooks/use-workflows";

interface WorkflowBuilderPageProps {
  tenantSlug: string;
  workflowId: string;
}

export function WorkflowBuilderPage({ tenantSlug, workflowId }: WorkflowBuilderPageProps) {
  const router = useRouter();
  const { canWrite } = usePermissions();
  const { workflow, loading, error, refresh } = useWorkflow(tenantSlug, workflowId);
  const meta = useWorkflowMeta(tenantSlug);

  if (loading) {
    return <p className="p-6 text-sm text-[var(--muted-foreground)]">Loading workflow...</p>;
  }

  if (error || !workflow) {
    return (
      <div className="p-6">
        <WidgetError title="Workflow" message={error ?? "Workflow not found"} onRetry={() => void refresh()} />
      </div>
    );
  }

  const readOnly = !canWrite("workflow");

  return (
    <div>
      <div className="border-b border-[var(--border)] px-4 py-2">
        <Link
          href={`/${tenantSlug}/workflows`}
          className="inline-flex h-8 items-center rounded-lg px-3 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to workflows
        </Link>
      </div>
      <WorkflowBuilder
        initialName={workflow.name}
        initialDescription={workflow.description ?? ""}
        initialTrigger={workflow.trigger_type}
        initialDefinition={workflow.definition}
        triggers={meta?.triggers ?? [workflow.trigger_type]}
        actions={meta?.actions ?? ["create_task", "send_notification", "create_activity"]}
        readOnly={readOnly}
        status={workflow.status}
        onSave={async (data) => {
          await updateWorkflow(tenantSlug, workflowId, data);
          await refresh();
        }}
        onPublish={
          readOnly
            ? undefined
            : async () => {
                await publishWorkflow(tenantSlug, workflowId);
                await refresh();
              }
        }
        onDuplicate={async () => {
          const copy = await duplicateWorkflow(tenantSlug, workflowId);
          router.push(`/${tenantSlug}/workflows/${copy.id}`);
        }}
        onPause={
          workflow.status === "published"
            ? async () => {
                await pauseWorkflow(tenantSlug, workflowId);
                await refresh();
              }
            : undefined
        }
        onResume={
          workflow.status === "paused"
            ? async () => {
                await resumeWorkflow(tenantSlug, workflowId);
                await refresh();
              }
            : undefined
        }
      />
    </div>
  );
}
