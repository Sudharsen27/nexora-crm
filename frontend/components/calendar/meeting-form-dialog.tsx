"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MEETING_PRIORITIES,
  MEETING_STATUSES,
  MEETING_TYPES,
} from "@/types/calendar";
import {
  MEETING_TYPE_LABELS,
  MEETING_STATUS_LABELS,
  type MeetingInput,
} from "@/lib/api/meetings";
import type { Meeting } from "@/types/calendar";
import type { Member } from "@/types/api";
import { MeetingLinkField } from "@/components/calendar/meeting-link-field";
import { MeetingParticipantsField } from "@/components/calendar/meeting-participants-field";

const schema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(10000).optional(),
  agenda: z.string().max(10000).optional(),
  meeting_type: z.enum(MEETING_TYPES),
  status: z.enum(MEETING_STATUSES),
  priority: z.enum(MEETING_PRIORITIES),
  start_datetime: z.string().min(1),
  end_datetime: z.string().min(1),
  timezone: z.string().optional(),
  location: z.string().optional(),
  meeting_url: z.string().optional(),
  organizer_id: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

interface MeetingFormDialogProps {
  open: boolean;
  tenantSlug: string;
  members: Member[];
  initial?: Meeting | null;
  defaultStart?: Date;
  onClose: () => void;
  onSubmit: (data: MeetingInput) => Promise<void>;
}

export function MeetingFormDialog({
  open,
  tenantSlug,
  members,
  initial,
  defaultStart,
  onClose,
  onSubmit,
}: MeetingFormDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(initial);

  const initialParticipantIds = useMemo(
    () =>
      initial?.participants
        .filter((p) => p.role !== "organizer")
        .map((p) => p.user_id) ?? [],
    [initial],
  );
  const [participantIds, setParticipantIds] = useState<string[]>(initialParticipantIds);

  useEffect(() => {
    if (open) setParticipantIds(initialParticipantIds);
  }, [open, initialParticipantIds]);

  const defaultStartStr = defaultStart
    ? toLocalInput(defaultStart.toISOString())
    : toLocalInput(new Date().toISOString());
  const defaultEndStr = defaultStart
    ? toLocalInput(new Date(defaultStart.getTime() + 3600000).toISOString())
    : toLocalInput(new Date(Date.now() + 3600000).toISOString());

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: initial
      ? {
          title: initial.title,
          description: initial.description ?? "",
          agenda: initial.agenda ?? "",
          meeting_type: initial.meeting_type,
          status: initial.status,
          priority: initial.priority,
          start_datetime: toLocalInput(initial.start_datetime),
          end_datetime: toLocalInput(initial.end_datetime),
          timezone: initial.timezone,
          location: initial.location ?? "",
          meeting_url: initial.meeting_url ?? "",
          organizer_id: initial.organizer_id ?? "",
        }
      : {
          title: "",
          description: "",
          agenda: "",
          meeting_type: "client_meeting",
          status: "scheduled",
          priority: "medium",
          start_datetime: defaultStartStr,
          end_datetime: defaultEndStr,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          location: "",
          meeting_url: "",
          organizer_id: "",
        },
  });

  const titleValue = watch("title");
  const meetingUrlValue = watch("meeting_url") ?? "";
  const organizerId = watch("organizer_id") ?? "";

  if (!open) return null;

  const buildParticipants = (organizer: string | undefined) => {
    const orgId = organizer?.trim() || "";
    return participantIds
      .filter((id) => id && id !== orgId)
      .map((user_id) => ({
        user_id,
        role: "attendee" as const,
        attendance_status: "invited" as const,
      }));
  };

  const submit = handleSubmit(async (data) => {
    setError(null);
    try {
      await onSubmit({
        ...data,
        start_datetime: new Date(data.start_datetime).toISOString(),
        end_datetime: new Date(data.end_datetime).toISOString(),
        organizer_id: data.organizer_id || null,
        location: data.location || null,
        meeting_url: data.meeting_url || null,
        participants: buildParticipants(data.organizer_id),
        reminders: [{ remind_before_minutes: 15, method: "in_app" }],
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save meeting");
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        <div className="border-b border-[var(--border)] px-6 py-5">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
            {isEdit ? "Edit meeting" : "Schedule meeting"}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Set the time, invite your team, and add a professional video link.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-5 p-6">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} />
            {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <select className="mt-1 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm" {...register("meeting_type")}>
                {MEETING_TYPES.map((t) => (
                  <option key={t} value={t}>{MEETING_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Status</Label>
              <select className="mt-1 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm" {...register("status")}>
                {MEETING_STATUSES.map((s) => (
                  <option key={s} value={s}>{MEETING_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start</Label>
              <Input type="datetime-local" {...register("start_datetime")} />
            </div>
            <div>
              <Label>End</Label>
              <Input type="datetime-local" {...register("end_datetime")} />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <textarea className="mt-1 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm" rows={2} {...register("description")} />
          </div>
          <div>
            <Label>Agenda</Label>
            <textarea className="mt-1 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2 text-sm" rows={2} {...register("agenda")} />
          </div>
          <div>
            <Label>Location</Label>
            <Input {...register("location")} placeholder="Office, address, or room name" />
          </div>
          <MeetingLinkField
            tenantSlug={tenantSlug}
            title={titleValue}
            value={meetingUrlValue}
            onChange={(url) => setValue("meeting_url", url, { shouldDirty: true })}
            onMeetingTypeHint={() => setValue("meeting_type", "online_meeting")}
          />
          <div>
            <Label>Meeting organizer</Label>
            <select
              className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2.5 text-sm"
              {...register("organizer_id")}
              onChange={(e) => {
                const value = e.target.value;
                setValue("organizer_id", value, { shouldDirty: true });
                if (value && participantIds.includes(value)) {
                  setParticipantIds(participantIds.filter((id) => id !== value));
                }
              }}
            >
              <option value="">Default (you)</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
              ))}
            </select>
          </div>
          <MeetingParticipantsField
            tenantSlug={tenantSlug}
            members={members}
            organizerId={organizerId}
            selectedIds={participantIds}
            onChange={setParticipantIds}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-[var(--border)] pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isEdit ? "Save changes" : "Schedule meeting"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
