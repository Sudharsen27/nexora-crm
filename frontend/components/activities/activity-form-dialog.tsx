"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACTIVITY_TYPES, ENTITY_TYPES, type ActivityInput } from "@/lib/api/activities";

const schema = z.object({
  entity_type: z.enum(ENTITY_TYPES),
  entity_id: z.string().min(1, "Entity is required"),
  activity_type: z.enum(ACTIVITY_TYPES),
  description: z.string().min(1, "Description is required").max(5000),
});

type FormData = z.infer<typeof schema>;

interface EntityOption {
  id: string;
  label: string;
}

interface ActivityFormDialogProps {
  open: boolean;
  tenantSlug: string;
  defaultEntityType?: (typeof ENTITY_TYPES)[number];
  defaultEntityId?: string;
  entityOptions?: EntityOption[];
  lockEntity?: boolean;
  onClose: () => void;
  onSubmit: (data: ActivityInput) => Promise<void>;
}

export function ActivityFormDialog({
  open,
  defaultEntityType = "contact",
  defaultEntityId = "",
  entityOptions = [],
  lockEntity = false,
  onClose,
  onSubmit,
}: ActivityFormDialogProps) {
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: {
      entity_type: defaultEntityType,
      entity_id: defaultEntityId,
      activity_type: "note",
      description: "",
    },
  });

  const entityType = watch("entity_type");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold">Log activity</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={handleSubmit(async (data) => {
            setError(null);
            try {
              await onSubmit({
                entity_type: data.entity_type,
                entity_id: data.entity_id,
                activity_type: data.activity_type,
                description: data.description.trim(),
              });
              onClose();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to save activity");
            }
          })}
        >
          {!lockEntity && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="entity_type">Related to</Label>
                <select
                  id="entity_type"
                  className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                  {...register("entity_type")}
                >
                  <option value="lead">Lead</option>
                  <option value="contact">Contact</option>
                  <option value="deal">Deal</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="entity_id">{entityType.charAt(0).toUpperCase() + entityType.slice(1)}</Label>
                {entityOptions.length > 0 ? (
                  <select
                    id="entity_id"
                    className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                    {...register("entity_id")}
                  >
                    <option value="">Select...</option>
                    {entityOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input id="entity_id" placeholder="Entity ID" {...register("entity_id")} />
                )}
                {errors.entity_id && (
                  <p className="text-sm text-red-600">{errors.entity_id.message}</p>
                )}
              </div>
            </div>
          )}
          {lockEntity && <input type="hidden" {...register("entity_id")} />}
          {lockEntity && <input type="hidden" {...register("entity_type")} />}
          <div className="space-y-2">
            <Label htmlFor="activity_type">Activity type</Label>
            <select
              id="activity_type"
              className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              {...register("activity_type")}
            >
              {ACTIVITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={4}
              className="flex w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              placeholder="Describe what happened..."
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Log activity"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
