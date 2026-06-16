"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, CalendarDays, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatDueDate,
  getTaskBoard,
  isOverdue,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  updateTaskStatus,
} from "@/lib/api/tasks";
import type { Task, TaskBoard } from "@/types/api";
import { cn } from "@/lib/utils";

interface TaskKanbanProps {
  tenantSlug: string;
  assignedToId?: string;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  refreshKey?: number;
}

const TASK_COLUMN_ORDER = ["pending", "in_progress", "completed"] as const;

function getAssigneeInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isDueToday(task: Task): boolean {
  if (!task.due_date) return false;
  const due = new Date(task.due_date);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return due.getTime() === today.getTime();
}

function TaskCard({
  task,
  tenantSlug,
  onEdit,
  onDelete,
}: {
  task: Task;
  tenantSlug: string;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { type: "task", task },
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-700 dark:bg-zinc-900",
        isDragging && "opacity-50 ring-2 ring-zinc-400",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="flex-1 cursor-grab text-left active:cursor-grabbing"
          {...listeners}
          {...attributes}
        >
          <Link
            href={`/${tenantSlug}/tasks/${task.id}`}
            className="font-medium leading-snug transition-colors hover:text-zinc-700 hover:underline dark:hover:text-zinc-200"
            onClick={(e) => e.stopPropagation()}
          >
            {task.title}
          </Link>
          <div className="mt-2 flex flex-wrap gap-1">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium,
              )}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>
          </div>
          <div
            className={cn(
              "mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs",
              isOverdue(task)
                ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                : isDueToday(task)
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
            )}
          >
            {isOverdue(task) ? <AlertTriangle className="h-3.5 w-3.5" /> : <CalendarDays className="h-3.5 w-3.5" />}
            <span>Due {formatDueDate(task.due_date)}</span>
          </div>
          {task.assigned_to && (
            <div className="mt-2 inline-flex items-center gap-2 text-xs text-zinc-500">
              <span
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-100"
                title={task.assigned_to.full_name}
                aria-label={task.assigned_to.full_name}
              >
                {getAssigneeInitials(task.assigned_to.full_name)}
              </span>
              <span className="truncate">{task.assigned_to.full_name}</span>
            </div>
          )}
        </button>
        <div className="flex shrink-0 gap-0.5">
          <Button variant="ghost" size="sm" onClick={() => onEdit(task)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(task)}>
            <Trash2 className="h-3.5 w-3.5 text-red-600" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function TaskColumn({
  slug,
  label,
  tasks,
  tenantSlug,
  onEdit,
  onDelete,
}: {
  slug: string;
  label: string;
  tasks: Task[];
  tenantSlug: string;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `status:${slug}`, data: { type: "column", status: slug } });

  return (
    <div
      className={cn(
        "flex w-[85vw] max-w-80 shrink-0 flex-col rounded-xl border border-zinc-200 bg-zinc-100/80 transition-all duration-200 sm:w-72 dark:border-zinc-800 dark:bg-zinc-900/50",
        isOver && "ring-2 ring-zinc-400 shadow-md",
      )}
    >
      <div className="p-3">
        <h3 className="font-semibold">{label}</h3>
        <p className="text-xs text-zinc-500">
          {tasks.length} task{tasks.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div ref={setNodeRef} className="flex min-h-[120px] flex-1 flex-col gap-2 p-2 pt-0">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            tenantSlug={tenantSlug}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
        {tasks.length === 0 && (
          <div className="rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center dark:border-zinc-700">
            <p className="text-xs text-zinc-400">Drop tasks here</p>
          </div>
        )}
      </div>
    </div>
  );
}

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {TASK_COLUMN_ORDER.map((status) => (
        <div
          key={status}
          className="flex w-[85vw] max-w-80 shrink-0 animate-pulse flex-col rounded-xl border border-zinc-200 bg-zinc-100/80 p-3 sm:w-72 dark:border-zinc-800 dark:bg-zinc-900/50"
        >
          <div className="h-5 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-1 h-3 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
                <div className="h-4 w-36 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-2 h-4 w-16 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-2 h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TaskKanban({
  tenantSlug,
  assignedToId,
  onEdit,
  onDelete,
  refreshKey = 0,
}: TaskKanbanProps) {
  const [board, setBoard] = useState<TaskBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTaskBoard(tenantSlug, assignedToId);
      setBoard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load board");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, assignedToId]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard, refreshKey]);

  function findTask(taskId: string): Task | null {
    if (!board) return null;
    for (const column of board.columns) {
      const task = column.tasks.find((t) => t.id === taskId);
      if (task) return task;
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    const task = findTask(String(event.active.id));
    if (task) setActiveTask(task);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const task = findTask(String(active.id));
    if (!task) return;

    const overId = String(over.id);
    let targetStatus = task.status;
    if (overId.startsWith("status:")) {
      targetStatus = overId.replace("status:", "");
    } else {
      const overTask = findTask(overId);
      if (overTask) targetStatus = overTask.status;
    }

    if (targetStatus === task.status) return;

    try {
      await updateTaskStatus(tenantSlug, task, targetStatus);
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move task");
    }
  }

  if (loading && !board) {
    return <KanbanSkeleton />;
  }

  return (
    <div className="space-y-4 animate-in fade-in-50 duration-300">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && board && board.total === 0 && (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900/30">
          <p className="text-base font-medium text-zinc-700 dark:text-zinc-200">No tasks to organize yet</p>
          <p className="mt-1 text-sm text-zinc-500">Create a task to start using your kanban workflow.</p>
        </div>
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {TASK_COLUMN_ORDER.map((statusSlug) => {
            const column = board?.columns.find((c) => c.slug === statusSlug);
            if (!column) return null;
            return (
              <TaskColumn
                key={column.slug}
                slug={column.slug}
                label={column.label}
                tasks={column.tasks}
                tenantSlug={tenantSlug}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            );
          })}
        </div>
        <DragOverlay>
          {activeTask ? (
            <div className="w-64 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              <p className="font-medium">{activeTask.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
