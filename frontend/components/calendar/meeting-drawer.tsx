"use client";

import { useEffect, useState } from "react";
import { X, Copy, CalendarClock, CheckCircle, XCircle, ExternalLink, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MeetingCard } from "@/components/calendar/meeting-card";
import {
  MEETING_STATUS_LABELS,
  MEETING_TYPE_LABELS,
  deleteMeeting,
  duplicateMeeting,
  getMeeting,
  updateMeetingStatus,
} from "@/lib/api/meetings";
import { formatMeetingDate, formatMeetingTime } from "@/lib/calendar-utils";
import {
  buildMeetingShareLink,
  copyMeetingLink,
  detectMeetingLinkProvider,
  meetingLinkProviderLabel,
} from "@/lib/meeting-link-utils";
import { usePermissions } from "@/contexts/permissions-context";
import type { Meeting } from "@/types/calendar";

interface MeetingDrawerProps {
  tenantSlug: string;
  meetingId: string | null;
  onClose: () => void;
  onEdit: (meeting: Meeting) => void;
  onChanged: () => void;
}

export function MeetingDrawer({ tenantSlug, meetingId, onClose, onEdit, onChanged }: MeetingDrawerProps) {
  const { canWrite, canDelete } = usePermissions();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"overview" | "participants" | "agenda" | "notes">("overview");
  const [copied, setCopied] = useState<"video" | "share" | null>(null);

  useEffect(() => {
    if (!meetingId) {
      setMeeting(null);
      return;
    }
    setLoading(true);
    getMeeting(tenantSlug, meetingId)
      .then(setMeeting)
      .catch(() => setMeeting(null))
      .finally(() => setLoading(false));
  }, [tenantSlug, meetingId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!meetingId) return null;

  async function handleStatus(status: string) {
    if (!meeting) return;
    await updateMeetingStatus(tenantSlug, meeting.id, status);
    onChanged();
    const updated = await getMeeting(tenantSlug, meeting.id);
    setMeeting(updated);
  }

  async function handleDuplicate() {
    if (!meeting) return;
    await duplicateMeeting(tenantSlug, meeting.id);
    onChanged();
    onClose();
  }

  async function handleDelete() {
    if (!meeting || !confirm("Delete this meeting?")) return;
    await deleteMeeting(tenantSlug, meeting.id);
    onChanged();
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
          <h2 className="text-lg font-semibold">Meeting Details</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-black/5">
            <X className="h-5 w-5" />
          </button>
        </div>
        {loading || !meeting ? (
          <div className="flex flex-1 items-center justify-center text-[var(--muted-foreground)]">Loading...</div>
        ) : (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="border-b border-[var(--border)] p-4">
              <MeetingCard event={meeting} />
              {meeting.meeting_url ? (
                <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--primary)]/5 p-3">
                  <p className="text-xs font-medium text-[var(--muted-foreground)]">
                    {meetingLinkProviderLabel(detectMeetingLinkProvider(meeting.meeting_url))}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <a href={meeting.meeting_url} target="_blank" rel="noreferrer">
                      <Button size="sm">
                        <Video className="mr-1 h-4 w-4" />
                        Join meeting
                      </Button>
                    </a>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void copyMeetingLink(meeting.meeting_url!).then((ok) => {
                          if (ok) {
                            setCopied("video");
                            setTimeout(() => setCopied(null), 2000);
                          }
                        });
                      }}
                    >
                      <Copy className="mr-1 h-4 w-4" />
                      {copied === "video" ? "Copied!" : "Copy video link"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const share = buildMeetingShareLink(tenantSlug, meeting.id);
                        void copyMeetingLink(share).then((ok) => {
                          if (ok) {
                            setCopied("share");
                            setTimeout(() => setCopied(null), 2000);
                          }
                        });
                      }}
                    >
                      <ExternalLink className="mr-1 h-4 w-4" />
                      {copied === "share" ? "Copied!" : "Copy calendar link"}
                    </Button>
                  </div>
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {canWrite("meeting") && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => onEdit(meeting)}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => void handleStatus("completed")}>
                      <CheckCircle className="mr-1 h-4 w-4" /> Complete
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void handleStatus("cancelled")}>
                      <XCircle className="mr-1 h-4 w-4" /> Cancel
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void handleDuplicate()}>
                      <Copy className="mr-1 h-4 w-4" /> Duplicate
                    </Button>
                  </>
                )}
                {canDelete("meeting") && (
                  <Button size="sm" variant="outline" onClick={() => void handleDelete()}>Delete</Button>
                )}
              </div>
            </div>
            <div className="flex gap-1 border-b border-[var(--border)] px-4">
              {(["overview", "participants", "agenda", "notes"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={`px-3 py-2 text-sm capitalize ${tab === t ? "border-b-2 border-[var(--primary)] font-medium" : "text-[var(--muted-foreground)]"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-sm">
              {tab === "overview" && (
                <dl className="space-y-3">
                  <div><dt className="text-[var(--muted-foreground)]">When</dt><dd>{formatMeetingDate(meeting.start_datetime)} · {formatMeetingTime(meeting.start_datetime, meeting.end_datetime)}</dd></div>
                  <div><dt className="text-[var(--muted-foreground)]">Type</dt><dd>{MEETING_TYPE_LABELS[meeting.meeting_type]}</dd></div>
                  <div><dt className="text-[var(--muted-foreground)]">Status</dt><dd>{MEETING_STATUS_LABELS[meeting.status]}</dd></div>
                  {meeting.location && <div><dt className="text-[var(--muted-foreground)]">Location</dt><dd>{meeting.location}</dd></div>}
                  {meeting.meeting_url && <div><dt className="text-[var(--muted-foreground)]">URL</dt><dd><a href={meeting.meeting_url} className="text-[var(--primary)] underline" target="_blank" rel="noreferrer">{meeting.meeting_url}</a></dd></div>}
                  {meeting.description && <div><dt className="text-[var(--muted-foreground)]">Description</dt><dd className="whitespace-pre-wrap">{meeting.description}</dd></div>}
                  {meeting.outcome && <div><dt className="text-[var(--muted-foreground)]">Outcome</dt><dd className="whitespace-pre-wrap">{meeting.outcome}</dd></div>}
                </dl>
              )}
              {tab === "participants" && (
                <ul className="space-y-2">
                  {meeting.participants.length === 0 ? (
                    <li className="text-[var(--muted-foreground)]">No participants</li>
                  ) : (
                    meeting.participants.map((p) => (
                      <li key={p.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2">
                        <span>{p.user?.full_name ?? p.user_id}</span>
                        <span className="text-xs text-[var(--muted-foreground)]">{p.role} · {p.attendance_status}</span>
                      </li>
                    ))
                  )}
                </ul>
              )}
              {tab === "agenda" && (
                <p className="whitespace-pre-wrap">{meeting.agenda || "No agenda provided."}</p>
              )}
              {tab === "notes" && (
                <p className="whitespace-pre-wrap">{meeting.notes || "No notes yet."}</p>
              )}
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
