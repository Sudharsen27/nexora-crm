"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CompanyPickerField } from "@/components/companies/company-picker-field";
import type { Deal, DealStageMeta, Member } from "@/types/api";
import type { DealInput } from "@/lib/api/deals";

const schema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(5000).optional(),
  stage: z.string().min(1),
  value: z.string().optional(),
  currency: z.string().length(3).optional(),
  expected_close_date: z.string().optional(),
  company_id: z.string().optional(),
  assigned_to_id: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface DealFormDialogProps {
  tenantSlug: string;
  open: boolean;
  stages: DealStageMeta[];
  members: Member[];
  initial?: Deal | null;
  defaultStage?: string;
  defaultLeadId?: string;
  defaultCompanyId?: string;
  onClose: () => void;
  onSubmit: (data: DealInput) => Promise<void>;
}

export function DealFormDialog({
  tenantSlug,
  open,
  stages,
  members,
  initial,
  defaultStage = "new",
  defaultLeadId,
  defaultCompanyId,
  onClose,
  onSubmit,
}: DealFormDialogProps) {
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
          stage: initial.stage,
          value: initial.value ?? "",
          currency: initial.currency,
          expected_close_date: initial.expected_close_date ?? "",
          company_id: initial.company_id ?? "",
          assigned_to_id: initial.assigned_to_id ?? "",
        }
      : {
          title: "",
          description: "",
          stage: defaultStage,
          value: "",
          currency: "USD",
          expected_close_date: "",
          company_id: defaultCompanyId ?? "",
          assigned_to_id: "",
        },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{isEdit ? "Edit deal" : "New deal"}</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={handleSubmit(async (data) => {
            setError(null);
            try {
              await onSubmit({
                title: data.title.trim(),
                description: data.description?.trim() || null,
                stage: data.stage,
                value: data.value ? Number(data.value) : null,
                currency: data.currency || "USD",
                expected_close_date: data.expected_close_date || null,
                lead_id: defaultLeadId ?? initial?.lead_id ?? null,
                company_id: data.company_id?.trim() || null,
                assigned_to_id: data.assigned_to_id || null,
              });
              onClose();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to save deal");
            }
          })}
        >
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input id="title" {...register("title")} placeholder="Enterprise license" />
            {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="stage">Stage</Label>
              <select
                id="stage"
                className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
                {...register("stage")}
              >
                {stages.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">Value</Label>
              <Input id="value" type="number" min="0" step="0.01" {...register("value")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expected_close_date">Expected close</Label>
              <Input id="expected_close_date" type="date" {...register("expected_close_date")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assigned_to_id">Assigned to</Label>
              <select
                id="assigned_to_id"
                className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
                {...register("assigned_to_id")}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <CompanyPickerField
            tenantSlug={tenantSlug}
            open={open}
            label="Company"
            registration={register("company_id")}
          />
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={3}
              className="flex w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
              {...register("description")}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Create deal"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
