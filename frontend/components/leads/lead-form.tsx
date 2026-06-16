"use client";

import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { LeadMeta } from "@/types/api";
import type { LeadInput } from "@/lib/api/leads";
import { SOURCE_LABELS, STATUS_LABELS } from "@/lib/api/leads";
import type { Member } from "@/types/api";

const schema = z
  .object({
    first_name: z.string().min(1, "First name is required").max(100),
    last_name: z.string().max(100).optional(),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    phone: z.string().max(50).optional(),
    company: z.string().max(255).optional(),
    job_title: z.string().max(150).optional(),
    status: z.string().min(1),
    source: z.string().optional(),
    estimated_value: z.string().optional(),
    notes: z.string().max(5000).optional(),
    assigned_to_id: z.string().optional(),
  })
  .refine((data) => data.first_name.trim() || (data.last_name?.trim() ?? ""), {
    message: "First name or last name is required",
    path: ["first_name"],
  });

type FormData = z.infer<typeof schema>;

interface LeadFormProps {
  meta: LeadMeta;
  members: Member[];
  initial?: Partial<FormData>;
  submitLabel: string;
  onSubmit: (data: LeadInput) => Promise<void>;
  onCancel: () => void;
}

export function LeadForm({ meta, members, initial, submitLabel, onSubmit, onCancel }: LeadFormProps) {
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: initial?.first_name ?? "",
      last_name: initial?.last_name ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      company: initial?.company ?? "",
      job_title: initial?.job_title ?? "",
      status: initial?.status ?? "new",
      source: initial?.source ?? "",
      estimated_value: initial?.estimated_value ?? "",
      notes: initial?.notes ?? "",
      assigned_to_id: initial?.assigned_to_id ?? "",
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{submitLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(async (data) => {
            setError(null);
            try {
              await onSubmit({
                first_name: data.first_name.trim(),
                last_name: data.last_name?.trim() || "",
                email: data.email?.trim() || null,
                phone: data.phone?.trim() || null,
                company: data.company?.trim() || null,
                job_title: data.job_title?.trim() || null,
                status: data.status,
                source: data.source || null,
                estimated_value: data.estimated_value ? Number(data.estimated_value) : null,
                notes: data.notes?.trim() || null,
                assigned_to_id: data.assigned_to_id || null,
              });
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to save lead");
            }
          })}
          className="grid gap-4 md:grid-cols-2"
        >
          <div className="space-y-2">
            <Label htmlFor="first_name">First name *</Label>
            <Input id="first_name" {...register("first_name")} />
            {errors.first_name && <p className="text-sm text-red-600">{errors.first_name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last name</Label>
            <Input id="last_name" {...register("last_name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register("phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" {...register("company")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="job_title">Job title</Label>
            <Input id="job_title" {...register("job_title")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
              {...register("status")}
            >
              {meta.statuses.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status] ?? status}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <select
              id="source"
              className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]"
              {...register("source")}
            >
              <option value="">—</option>
              {meta.sources.map((source) => (
                <option key={source} value={source}>
                  {SOURCE_LABELS[source] ?? source}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="estimated_value">Estimated value</Label>
            <Input id="estimated_value" type="number" min="0" step="0.01" {...register("estimated_value")} />
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
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              rows={4}
              className="flex w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
              {...register("notes")}
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 md:col-span-2">{error}</p>
          )}
          <div className="flex gap-3 md:col-span-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : submitLabel}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
