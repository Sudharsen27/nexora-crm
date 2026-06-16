"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, LayoutGrid, List, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskKanban } from "@/components/tasks/task-kanban";
import {
  createTask,
  deleteTask,
  formatDueDate,
  isOverdue,
  listTasks,
  markTaskComplete,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_PRIORITIES,
  updateTask,
} from "@/lib/api/tasks";
import { listMembers } from "@/lib/api/tenants";
import type { Member, Task } from "@/types/api";
import { cn } from "@/lib/utils";

interface TasksPageProps {
  tenantSlug: string;
}

function TaskListSkeleton() {
  return (
    <div className="overflow-x-auto animate-pulse">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-left dark:border-zinc-800">
            <th className="px-4 py-3 font-medium">Title</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Priority</th>
            <th className="px-4 py-3 font-medium">Due</th>
            <th className="px-4 py-3 font-medium">Assignee</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 5 }).map((_, idx) => (
            <tr key={idx} className="border-b border-zinc-100 dark:border-zinc-800/50">
              <td className="px-4 py-3">
                <div className="h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
              </td>
              <td className="px-4 py-3">
                <div className="h-5 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
              </td>
              <td className="px-4 py-3">
                <div className="h-4 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
              </td>
              <td className="px-4 py-3">
                <div className="ml-auto h-8 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TasksPage({ tenantSlug }: TasksPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const view = searchParams.get("view") ?? "list";
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const assignedTo = searchParams.get("assigned_to_id") ?? "";
  const dueFilter = searchParams.get("due") ?? "";
  const page = Number(searchParams.get("page") ?? "1");

  const [searchInput, setSearchInput] = useState(q);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      });
      router.push(`/${tenantSlug}/tasks?${params.toString()}`);
    },
    [router, searchParams, tenantSlug],
  );

  const loadTasks = useCallback(async () => {
    if (view === "kanban") return;
    setLoading(true);
    setError(null);
    try {
      const data = await listTasks(tenantSlug, {
        q: q || undefined,
        status: status || undefined,
        priority: priority || undefined,
        assigned_to_id: assignedTo || undefined,
        due_today: dueFilter === "today",
        overdue: dueFilter === "overdue",
        page,
        page_size: 10,
        sort_by: "due_date",
        sort_order: "asc",
      });
      setTasks(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, q, status, priority, assignedTo, dueFilter, page, view]);

  useEffect(() => {
    void listMembers(tenantSlug).then(setMembers);
  }, [tenantSlug]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  async function handleDelete(task: Task) {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    try {
      await deleteTask(tenantSlug, task.id);
      await loadTasks();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  }

  async function handleComplete(task: Task) {
    try {
      await markTaskComplete(tenantSlug, task);
      await loadTasks();
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete task");
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Tasks</h2>
          <p className="text-zinc-500">
            {view === "list" ? `${total} task${total !== 1 ? "s" : ""} total` : "Drag tasks between columns"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={view === "list" ? "default" : "outline"}
            onClick={() => updateParams({ view: "list" })}
          >
            <List className="h-4 w-4" />
            List
          </Button>
          <Button
            variant={view === "kanban" ? "default" : "outline"}
            onClick={() => updateParams({ view: "kanban" })}
          >
            <LayoutGrid className="h-4 w-4" />
            Kanban
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New task
          </Button>
        </div>
      </div>

      <Card className="transition-all duration-200 hover:shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Search & filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6"
            onSubmit={(e) => {
              e.preventDefault();
              updateParams({ q: searchInput.trim() || null, page: "1" });
            }}
          >
            <div className="relative sm:col-span-2 xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="pl-9"
                placeholder="Search tasks..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <select
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
              value={status}
              onChange={(e) => updateParams({ status: e.target.value || null, page: "1" })}
            >
              <option value="">All statuses</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
              value={priority}
              onChange={(e) => updateParams({ priority: e.target.value || null, page: "1" })}
            >
              <option value="">All priorities</option>
              {TASK_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
              value={assignedTo}
              onChange={(e) => updateParams({ assigned_to_id: e.target.value || null, page: "1" })}
            >
              <option value="">All assignees</option>
              {members.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.full_name}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
              value={dueFilter}
              onChange={(e) => updateParams({ due: e.target.value || null, page: "1" })}
            >
              <option value="">All due dates</option>
              <option value="today">Due today</option>
              <option value="overdue">Overdue</option>
            </select>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      {view === "kanban" ? (
        <TaskKanban
          tenantSlug={tenantSlug}
          assignedToId={assignedTo || undefined}
          refreshKey={refreshKey}
          onEdit={(task) => {
            setEditing(task);
            setFormOpen(true);
          }}
          onDelete={(task) => void handleDelete(task)}
        />
      ) : (
        <Card className="transition-all duration-200 hover:shadow-sm">
          <CardContent className="p-0">
            {error && <p className="p-4 text-sm text-red-600">{error}</p>}
            {loading ? (
              <TaskListSkeleton />
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                <p className="text-base font-medium text-zinc-700 dark:text-zinc-200">No tasks match your filters</p>
                <p className="mt-1 text-sm text-zinc-500">Try changing search/filter values or create a new task.</p>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() =>
                    updateParams({
                      q: null,
                      status: null,
                      priority: null,
                      assigned_to_id: null,
                      due: null,
                      page: "1",
                    })
                  }
                >
                  Reset filters
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left dark:border-zinc-800">
                      <th className="px-4 py-3 font-medium">Title</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Priority</th>
                      <th className="px-4 py-3 font-medium">Due</th>
                      <th className="px-4 py-3 font-medium">Assignee</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <tr
                        key={task.id}
                        className="border-b border-zinc-100 transition-colors duration-150 hover:bg-zinc-50 dark:border-zinc-800/50 dark:hover:bg-zinc-900/60"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/${tenantSlug}/tasks/${task.id}`}
                            className="font-medium transition-colors hover:text-zinc-700 hover:underline dark:hover:text-zinc-200"
                          >
                            {task.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{STATUS_LABELS[task.status] ?? task.status}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-medium",
                              PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium,
                            )}
                          >
                            {PRIORITY_LABELS[task.priority]}
                          </span>
                        </td>
                        <td className={cn("px-4 py-3", isOverdue(task) && "text-red-600")}>
                          {formatDueDate(task.due_date)}
                        </td>
                        <td className="px-4 py-3">{task.assigned_to?.full_name ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
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
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {view === "list" && pages > 1 && (
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-zinc-500">
            Page {page} of {pages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <TaskFormDialog
        open={formOpen}
        members={members}
        initial={editing}
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
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}
