"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ACTIVITY_TYPES, ENTITY_TYPES, type ActivityInput } from "@/lib/api/activities";
import { formatContactName, listContacts } from "@/lib/api/contacts";
import { formatLeadName, listLeads } from "@/lib/api/leads";
import { getDealBoard } from "@/lib/api/deals";
import { listCompanies } from "@/lib/api/companies";

const schema = z.object({
  entity_type: z.enum(ENTITY_TYPES),
  entity_id: z
    .string()
    .min(1, "Please select a record")
    .uuid("Please select a valid record from the list"),
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
  tenantSlug,
  defaultEntityType = "contact",
  defaultEntityId = "",
  entityOptions: initialEntityOptions = [],
  lockEntity = false,
  onClose,
  onSubmit,
}: ActivityFormDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [entityOptions, setEntityOptions] = useState<EntityOption[]>(initialEntityOptions);
  const [loadingEntities, setLoadingEntities] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
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

  useEffect(() => {
    if (lockEntity || !open) return;

    let cancelled = false;
    setLoadingEntities(true);

    async function loadOptions() {
      try {
        let options: EntityOption[] = [];
        if (entityType === "lead") {
          const data = await listLeads(tenantSlug, { page_size: 50 });
          options = data.items.map((l) => ({ id: l.id, label: formatLeadName(l) }));
        } else if (entityType === "contact") {
          const data = await listContacts(tenantSlug, { page_size: 50 });
          options = data.items.map((c) => ({ id: c.id, label: formatContactName(c) }));
        } else if (entityType === "deal") {
          const board = await getDealBoard(tenantSlug);
          options = board.stages.flatMap((s) => s.deals).map((d) => ({ id: d.id, label: d.title }));
        } else if (entityType === "company") {
          const data = await listCompanies(tenantSlug, { page_size: 50 });
          options = data.items.map((c) => ({ id: c.id, label: c.company_name }));
        }
        if (!cancelled) {
          setEntityOptions(options);
          setValue("entity_id", "");
        }
      } catch {
        if (!cancelled) setEntityOptions([]);
      } finally {
        if (!cancelled) setLoadingEntities(false);
      }
    }

    void loadOptions();
    return () => {
      cancelled = true;
    };
  }, [entityType, lockEntity, open, tenantSlug, setValue]);

  useEffect(() => {
    if (!lockEntity && open && initialEntityOptions.length > 0) {
      setEntityOptions(initialEntityOptions);
    }
  }, [initialEntityOptions, lockEntity, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Log activity</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={handleSubmit(async (data) => {
            setError(null);
            try {
              await onSubmit({
                entity_type: lockEntity ? defaultEntityType : data.entity_type,
                entity_id: lockEntity ? defaultEntityId : data.entity_id,
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
                  className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
                  {...register("entity_type")}
                >
                  <option value="lead">Lead</option>
                  <option value="contact">Contact</option>
                  <option value="deal">Deal</option>
                  <option value="company">Company</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="entity_id">{entityType.charAt(0).toUpperCase() + entityType.slice(1)}</Label>
                <select
                  id="entity_id"
                  className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
                  {...register("entity_id")}
                  disabled={loadingEntities}
                >
                  <option value="">
                    {loadingEntities ? "Loading..." : "Select a record..."}
                  </option>
                  {entityOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.entity_id && (
                  <p className="text-sm text-red-600">{errors.entity_id.message}</p>
                )}
              </div>
            </div>
          )}
          {lockEntity && (
            <p className="rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-sm text-zinc-600">
              Linked to this {defaultEntityType}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="activity_type">Activity type</Label>
            <select
              id="activity_type"
              className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
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
              className="flex w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
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
