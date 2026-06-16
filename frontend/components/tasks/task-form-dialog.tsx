"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRIORITY_LABELS, STATUS_LABELS, TASK_PRIORITIES, TASK_STATUSES, type TaskInput } from "@/lib/api/tasks";
import type { Member, Task } from "@/types/api";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(5000).optional(),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  due_date: z.string().optional(),
  assigned_to_id: z.string().optional(),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface TaskFormDialogProps {
  open: boolean;
  members: Member[];
  initial?: Task | null;
  defaultStatus?: string;
  lockEntity?: boolean;
  defaultEntityType?: string;
  defaultEntityId?: string;
  onClose: () => void;
  onSubmit: (data: TaskInput) => Promise<void>;
}

export function TaskFormDialog({
  open,
  members,
  initial,
  defaultStatus = "pending",
  lockEntity = false,
  defaultEntityType = "",
  defaultEntityId = "",
  onClose,
  onSubmit,
}: TaskFormDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(initial);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: initial
      ? {
          title: initial.title,
          description: initial.description ?? "",
          status: initial.status as FormData["status"],
          priority: initial.priority as FormData["priority"],
          due_date: initial.due_date ?? "",
          assigned_to_id: initial.assigned_to_id ?? "",
          entity_type: initial.entity_type ?? "",
          entity_id: initial.entity_id ?? "",
        }
      : {
          title: "",
          description: "",
          status: defaultStatus as FormData["status"],
          priority: "medium",
          due_date: "",
          assigned_to_id: "",
          entity_type: defaultEntityType,
          entity_id: defaultEntityId,
        },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{isEdit ? "Edit task" : "New task"}</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={handleSubmit(async (data) => {
            setError(null);
            try {
              await onSubmit({
                title: data.title.trim(),
                description: data.description?.trim() || null,
                status: data.status,
                priority: data.priority,
                due_date: data.due_date || null,
                assigned_to_id: data.assigned_to_id || null,
                entity_type: data.entity_type || null,
                entity_id: data.entity_id || null,
              });
              onClose();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to save task");
            }
          })}
        >
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" {...register("title")} />
            {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={3}
              className="flex w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
              {...register("description")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
                {...register("status")}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
                {...register("priority")}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="due_date">Due date</Label>
              <Input id="due_date" type="date" {...register("due_date")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assigned_to_id">Assigned to</Label>
              <select
                id="assigned_to_id"
                className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
                {...register("assigned_to_id")}
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {!lockEntity && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="entity_type">Related entity</Label>
                <select
                  id="entity_type"
                  className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
                  {...register("entity_type")}
                >
                  <option value="">None</option>
                  <option value="lead">Lead</option>
                  <option value="contact">Contact</option>
                  <option value="deal">Deal</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="entity_id">Entity ID</Label>
                <Input id="entity_id" placeholder="Optional" {...register("entity_id")} />
              </div>
            </div>
          )}
          {lockEntity && (
            <>
              <input type="hidden" {...register("entity_type")} />
              <input type="hidden" {...register("entity_id")} />
            </>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Create task"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
