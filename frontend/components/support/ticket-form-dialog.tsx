"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CHANNEL_LABELS,
  PRIORITY_LABELS,
  TICKET_PRIORITIES,
} from "@/lib/api/support";
import type { TicketCreateInput, TicketMeta } from "@/types/support";

const schema = z.object({
  subject: z.string().min(1, "Subject is required").max(255),
  description: z.string().min(1, "Description is required").max(8000),
  priority: z.enum(TICKET_PRIORITIES),
  category: z.string().min(1),
  channel: z.string().min(1),
  contact_id: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface TicketFormDialogProps {
  open: boolean;
  meta?: TicketMeta | null;
  onClose: () => void;
  onSubmit: (data: TicketCreateInput) => Promise<void>;
}

export function TicketFormDialog({ open, meta, onClose, onSubmit }: TicketFormDialogProps) {
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      subject: "",
      description: "",
      priority: "medium",
      category: meta?.categories[0] ?? "general",
      channel: "internal",
      contact_id: "",
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <h2 className="text-lg font-semibold">New Support Ticket</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={handleSubmit(async (data) => {
            setError(null);
            try {
              await onSubmit({
                subject: data.subject.trim(),
                description: data.description.trim(),
                priority: data.priority,
                category: data.category,
                channel: data.channel,
                contact_id: data.contact_id || null,
              });
              reset();
              onClose();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to save ticket");
            }
          })}
        >
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" {...register("subject")} className="mt-1" />
            {errors.subject && <p className="mt-1 text-xs text-red-600">{errors.subject.message}</p>}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={4}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
              {...register("description")}
            />
            {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                className="mt-1 h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                {...register("priority")}
              >
                {TICKET_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="channel">Channel</Label>
              <select
                id="channel"
                className="mt-1 h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                {...register("channel")}
              >
                {(meta?.channels ?? Object.keys(CHANNEL_LABELS)).map((c) => (
                  <option key={c} value={c}>
                    {CHANNEL_LABELS[c] ?? c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              className="mt-1 h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              {...register("category")}
            >
              {(meta?.categories ?? ["general"]).map((c) => (
                <option key={c} value={c}>
                  {c.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-violet-600 hover:bg-violet-700">
              {isSubmitting ? "Creating…" : "Create Ticket"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
