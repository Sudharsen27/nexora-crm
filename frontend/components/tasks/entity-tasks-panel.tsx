"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import {
  createTask,
  deleteTask,
  formatDueDate,
  isOverdue,
  listEntityTasks,
  markTaskComplete,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  updateTask,
} from "@/lib/api/tasks";
import { listMembers } from "@/lib/api/tenants";
import type { Member, Task } from "@/types/api";
import { cn } from "@/lib/utils";

interface EntityTasksPanelProps {
  tenantSlug: string;
  entityType: "lead" | "contact" | "deal" | "company";
  entityId: string;
}

export function EntityTasksPanel({ tenantSlug, entityType, entityId }: EntityTasksPanelProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listEntityTasks(tenantSlug, entityType, entityId, { page_size: 50 });
      setTasks(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, entityType, entityId]);

  useEffect(() => {
    void loadTasks();
    void listMembers(tenantSlug).then(setMembers);
  }, [loadTasks, tenantSlug]);

  async function handleDelete(task: Task) {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    try {
      await deleteTask(tenantSlug, task.id);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  }

  async function handleComplete(task: Task) {
    try {
      await markTaskComplete(tenantSlug, task);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete task");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-500">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</p>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add task
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading ? (
        <p className="text-sm text-zinc-500">Loading tasks...</p>
      ) : tasks.length === 0 ? (
        <p className="py-6 text-center text-sm text-zinc-500">No tasks yet.</p>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/${tenantSlug}/tasks/${task.id}`}
                  className="font-medium hover:underline"
                >
                  {task.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-medium",
                      PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium,
                    )}
                  >
                    {PRIORITY_LABELS[task.priority]}
                  </span>
                  <span className="text-zinc-500">{STATUS_LABELS[task.status] ?? task.status}</span>
                  <span className={cn("text-zinc-500", isOverdue(task) && "text-red-600")}>
                    Due {formatDueDate(task.due_date)}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                {task.status !== "completed" && (
                  <Button variant="ghost" size="sm" onClick={() => void handleComplete(task)}>
                    <Check className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(task);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void handleDelete(task)}>
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <TaskFormDialog
        open={formOpen}
        members={members}
        initial={editing}
        lockEntity={!editing}
        defaultEntityType={entityType}
        defaultEntityId={entityId}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={async (data) => {
          if (editing) {
            await updateTask(tenantSlug, editing.id, data);
          } else {
            await createTask(tenantSlug, data);
          }
          await loadTasks();
        }}
      />
    </div>
  );
}
