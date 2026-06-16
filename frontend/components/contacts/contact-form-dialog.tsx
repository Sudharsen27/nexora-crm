"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Contact, Member } from "@/types/api";
import type { ContactInput } from "@/lib/api/contacts";

const schema = z.object({
  first_name: z.string().min(1, "First name is required").max(100),
  last_name: z.string().max(100).optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  company: z.string().max(255).optional(),
  job_title: z.string().max(150).optional(),
  assigned_to_id: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ContactFormDialogProps {
  open: boolean;
  members: Member[];
  initial?: Contact | null;
  onClose: () => void;
  onSubmit: (data: ContactInput) => Promise<void>;
}

export function ContactFormDialog({
  open,
  members,
  initial,
  onClose,
  onSubmit,
}: ContactFormDialogProps) {
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
          first_name: initial.first_name,
          last_name: initial.last_name,
          email: initial.email ?? "",
          phone: initial.phone ?? "",
          company: initial.company ?? "",
          job_title: initial.job_title ?? "",
          assigned_to_id: initial.assigned_to_id ?? "",
        }
      : {
          first_name: "",
          last_name: "",
          email: "",
          phone: "",
          company: "",
          job_title: "",
          assigned_to_id: "",
        },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{isEdit ? "Edit contact" : "New contact"}</h2>
        <form
          className="mt-4 space-y-4"
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
                assigned_to_id: data.assigned_to_id || null,
                lead_id: initial?.lead_id ?? null,
              });
              onClose();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to save contact");
            }
          })}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="first_name">First name *</Label>
              <Input id="first_name" {...register("first_name")} />
              {errors.first_name && (
                <p className="text-sm text-red-600">{errors.first_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last name</Label>
              <Input id="last_name" {...register("last_name")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input id="company" {...register("company")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job_title">Job title</Label>
              <Input id="job_title" {...register("job_title")} />
            </div>
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
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Create contact"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
