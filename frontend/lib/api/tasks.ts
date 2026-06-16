import { apiFetch } from "@/lib/api/client";
import type {
  Task,
  TaskBoard,
  TaskDashboardSummary,
  TaskFilters,
  TaskListResponse,
} from "@/types/api";

export type TaskInput = {
  title: string;
  description?: string | null;
  status?: string;
  priority?: string;
  due_date?: string | null;
  assigned_to_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
};

export const TASK_STATUSES = ["pending", "in_progress", "completed", "cancelled"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const KANBAN_STATUSES = ["pending", "in_progress", "completed"] as const;

export const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  medium: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  high: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function buildQuery(filters: TaskFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.assigned_to_id) params.set("assigned_to_id", filters.assigned_to_id);
  if (filters.entity_type) params.set("entity_type", filters.entity_type);
  if (filters.entity_id) params.set("entity_id", filters.entity_id);
  if (filters.due_today) params.set("due_today", "true");
  if (filters.overdue) params.set("overdue", "true");
  if (filters.page) params.set("page", String(filters.page));
  if (filters.page_size) params.set("page_size", String(filters.page_size));
  if (filters.sort_by) params.set("sort_by", filters.sort_by);
  if (filters.sort_order) params.set("sort_order", filters.sort_order);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function listTasks(slug: string, filters: TaskFilters = {}): Promise<TaskListResponse> {
  return apiFetch<TaskListResponse>(`/tenants/${slug}/tasks${buildQuery(filters)}`);
}

export async function listMyTasks(slug: string, filters: TaskFilters = {}): Promise<TaskListResponse> {
  const params = buildQuery(filters);
  return apiFetch<TaskListResponse>(`/tenants/${slug}/tasks/my-tasks${params}`);
}

export async function listEntityTasks(
  slug: string,
  entityType: string,
  entityId: string,
  filters: TaskFilters = {},
): Promise<TaskListResponse> {
  const params = buildQuery(filters);
  return apiFetch<TaskListResponse>(
    `/tenants/${slug}/tasks/entity/${entityType}/${entityId}${params}`,
  );
}

export async function getTaskBoard(
  slug: string,
  assignedToId?: string,
): Promise<TaskBoard> {
  const params = assignedToId ? `?assigned_to_id=${assignedToId}` : "";
  return apiFetch<TaskBoard>(`/tenants/${slug}/tasks/board${params}`);
}

export async function getTaskSummary(slug: string): Promise<TaskDashboardSummary> {
  return apiFetch<TaskDashboardSummary>(`/tenants/${slug}/tasks/summary`);
}

export async function getTask(slug: string, taskId: string): Promise<Task> {
  return apiFetch<Task>(`/tenants/${slug}/tasks/${taskId}`);
}

export async function createTask(slug: string, data: TaskInput): Promise<Task> {
  return apiFetch<Task>(`/tenants/${slug}/tasks`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTask(slug: string, taskId: string, data: TaskInput): Promise<Task> {
  return apiFetch<Task>(`/tenants/${slug}/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteTask(slug: string, taskId: string): Promise<void> {
  await apiFetch<void>(`/tenants/${slug}/tasks/${taskId}`, { method: "DELETE" });
}

export function taskToInput(task: Task): TaskInput {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    due_date: task.due_date,
    assigned_to_id: task.assigned_to_id,
    entity_type: task.entity_type,
    entity_id: task.entity_id,
  };
}

export async function markTaskComplete(slug: string, task: Task): Promise<Task> {
  return updateTask(slug, task.id, { ...taskToInput(task), status: "completed" });
}

export async function updateTaskStatus(slug: string, task: Task, status: string): Promise<Task> {
  return updateTask(slug, task.id, { ...taskToInput(task), status });
}

export function formatDueDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function isOverdue(task: Task): boolean {
  if (!task.due_date || task.status === "completed" || task.status === "cancelled") return false;
  const due = new Date(task.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}
