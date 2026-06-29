"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermissions } from "@/contexts/permissions-context";
import { ActivityTimeline } from "@/components/activities/activity-timeline";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import {
  deleteTask,
  formatDueDate,
  getTask,
  markTaskComplete,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  updateTask,
} from "@/lib/api/tasks";
import { listMembers } from "@/lib/api/tenants";
import type { Member, Task } from "@/types/api";
import { cn } from "@/lib/utils";

interface TaskDetailPageProps {
  tenantSlug: string;
  taskId: string;
}

export function TaskDetailPage({ tenantSlug, taskId }: TaskDetailPageProps) {
  const router = useRouter();
  const { canWrite, canDelete } = usePermissions();
  const [task, setTask] = useState<Task | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  async function loadTask() {
    setLoading(true);
    setError(null);
    try {
      const data = await getTask(tenantSlug, taskId);
      setTask(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load task");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTask();
    void listMembers(tenantSlug).then(setMembers);
  }, [tenantSlug, taskId]);

  async function handleDelete() {
    if (!task || !confirm(`Delete task "${task.title}"?`)) return;
    try {
      await deleteTask(tenantSlug, task.id);
      router.push(`/${tenantSlug}/tasks`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  }

  async function handleComplete() {
    if (!task) return;
    try {
      await markTaskComplete(tenantSlug, task);
      await loadTask();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete task");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-4 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-8 w-64 rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
              <div className="h-5 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="mt-3 h-4 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="mt-2 h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="space-y-4">
        <Link href={`/${tenantSlug}/tasks`} className="inline-flex items-center gap-2 text-sm text-zinc-500">
          <ArrowLeft className="h-4 w-4" />
          Back to tasks
        </Link>
        <p className="text-red-600">{error ?? "Task not found"}</p>
      </div>
    );
  }

  const entityLink =
    task.entity_type && task.entity_id
      ? `/${tenantSlug}/${task.entity_type === "lead" ? "leads" : `${task.entity_type}s`}/${task.entity_id}${task.entity_type === "lead" ? "/edit" : ""}`
      : null;

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href={`/${tenantSlug}/tasks`}
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to tasks
          </Link>
          <h2 className="text-2xl font-semibold">{task.title}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium,
              )}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>
            <span className="text-sm text-zinc-500">{STATUS_LABELS[task.status]}</span>
          </div>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          {task.status !== "completed" && canWrite("task") && (
            <Button variant="outline" className="transition-all hover:shadow-sm" onClick={() => void handleComplete()}>
              <Check className="h-4 w-4" />
              Mark complete
            </Button>
          )}
          {canWrite("task") && (
            <Button variant="outline" className="transition-all hover:shadow-sm" onClick={() => setFormOpen(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
          {canDelete("task") && (
            <Button variant="outline" className="transition-all hover:shadow-sm" onClick={() => void handleDelete()}>
              <Trash2 className="h-4 w-4 text-red-600" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Task information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-zinc-500">Description</p>
              <p>{task.description ?? "—"}</p>
            </div>
            <div>
              <p className="text-zinc-500">Due date</p>
              <p>{formatDueDate(task.due_date)}</p>
            </div>
            <div>
              <p className="text-zinc-500">Status</p>
              <p>{STATUS_LABELS[task.status]}</p>
            </div>
            <div>
              <p className="text-zinc-500">Priority</p>
              <p>{PRIORITY_LABELS[task.priority]}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assignment information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-zinc-500">Assigned to</p>
              {task.assigned_to ? (
                <div>
                  <p className="font-medium">{task.assigned_to.full_name}</p>
                  <p className="text-zinc-500">{task.assigned_to.email}</p>
                </div>
              ) : (
                <p>Unassigned</p>
              )}
            </div>
            <div>
              <p className="text-zinc-500">Created by</p>
              <p>{task.created_by?.full_name ?? "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Related entity</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {task.entity_type && task.entity_id ? (
              <div>
                <p className="capitalize text-zinc-500">{task.entity_type}</p>
                {entityLink ? (
                  <Link href={entityLink} className="font-medium hover:underline">
                    View {task.entity_type}
                  </Link>
                ) : (
                  <p>{task.entity_id}</p>
                )}
              </div>
            ) : (
              <p className="text-zinc-500">No related entity</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Activity history</CardTitle>
          </CardHeader>
          <CardContent>
            {task.entity_type && task.entity_id ? (
              <ActivityTimeline
                tenantSlug={tenantSlug}
                entityType={task.entity_type as "lead" | "contact" | "deal"}
                entityId={task.entity_id}
                compact
                pageSize={10}
              />
            ) : (
              <p className="text-sm text-zinc-500">
                Link this task to a lead, contact, or deal to see related activity.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <TaskFormDialog
        open={formOpen}
        members={members}
        initial={task}
        onClose={() => setFormOpen(false)}
        onSubmit={async (data) => {
          await updateTask(tenantSlug, task.id, data);
          await loadTask();
        }}
      />
    </div>
  );
}
