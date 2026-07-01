"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, Paperclip, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "@/components/emails/rich-text-editor";
import {
  createDraft,
  listEmailTemplates,
  PRIORITY_LABELS,
  scheduleEmail,
  sendEmail,
  updateEmail,
  uploadEmailAttachment,
} from "@/lib/api/emails";
import { EMAIL_PRIORITIES } from "@/types/email";
import type { Email, EmailInput, EmailRecipient, EmailTemplate } from "@/types/email";

interface EmailComposeDialogProps {
  open: boolean;
  tenantSlug: string;
  mode?: "compose" | "reply" | "forward";
  initial?: Partial<EmailInput> & { email_id?: string };
  replyTo?: Email | null;
  onClose: () => void;
  onSent: () => void;
}

const TITLES = {
  compose: "New message",
  reply: "Reply",
  forward: "Forward",
} as const;

const SUBTITLES = {
  compose: "Send a tracked email linked to your CRM records",
  reply: "Your reply will be linked to the original thread",
  forward: "Forward this message to new recipients",
} as const;

function parseRecipients(raw: string, type: "to" | "cc" | "bcc"): EmailRecipient[] {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((email_address) => emailPattern.test(email_address))
    .map((email_address) => ({ recipient_type: type, email_address }));
}

export function EmailComposeDialog({
  open,
  tenantSlug,
  mode = "compose",
  initial,
  replyTo,
  onClose,
  onSent,
}: EmailComposeDialogProps) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedMode = replyTo ? "reply" : mode;

  useEffect(() => {
    if (!open) return;
    listEmailTemplates(tenantSlug).then((r) => setTemplates(r.items)).catch(() => setTemplates([]));
    if (replyTo) {
      setSubject(replyTo.subject.startsWith("Re:") ? replyTo.subject : `Re: ${replyTo.subject}`);
      setTo(replyTo.from_email ?? "");
      setBodyHtml("");
    } else if (resolvedMode === "forward") {
      setTo("");
      setSubject(initial?.subject ?? "");
      setBodyHtml(
        initial?.body_html
          ? `<br/><br/><blockquote style="border-left:3px solid #ccc;padding-left:12px;margin:0;color:#666">${initial.body_html}</blockquote>`
          : "",
      );
    } else {
      setTo("");
      setSubject(initial?.subject ?? "");
      setBodyHtml(initial?.body_html ?? "");
      setPriority(initial?.priority ?? "normal");
      setDraftId(initial?.email_id ?? null);
    }
    setCc("");
    setBcc("");
    setShowCc(false);
    setShowBcc(false);
    setScheduleAt("");
    setAttachments([]);
    setError(null);
  }, [open, replyTo, initial, tenantSlug, resolvedMode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, saving]);

  const recipients = useMemo(
    () => [
      ...parseRecipients(to, "to"),
      ...parseRecipients(cc, "cc"),
      ...parseRecipients(bcc, "bcc"),
    ],
    [to, cc, bcc],
  );

  const applyTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setTemplateId(id);
    setSubject(t.subject);
    setBodyHtml(t.body_html);
  };

  const buildPayload = () => ({
    subject,
    body_html: bodyHtml,
    priority,
    recipients,
    company_id: initial?.company_id,
    contact_id: initial?.contact_id,
    lead_id: initial?.lead_id,
    deal_id: initial?.deal_id,
    task_id: initial?.task_id,
    meeting_id: initial?.meeting_id,
    template_id: templateId || undefined,
    parent_email_id: replyTo?.id,
    include_signature: true,
  });

  const ensureDraft = async (): Promise<string> => {
    if (draftId) {
      await updateEmail(tenantSlug, draftId, buildPayload());
      return draftId;
    }
    const draft = await createDraft(tenantSlug, buildPayload());
    setDraftId(draft.id);
    return draft.id;
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setError(null);
    try {
      await ensureDraft();
      onSent();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!recipients.length) {
      setError("Add at least one valid recipient email address");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const id = await ensureDraft();
      for (const file of attachments) {
        await uploadEmailAttachment(tenantSlug, id, file);
      }
      if (scheduleAt) {
        const scheduled = new Date(scheduleAt);
        if (Number.isNaN(scheduled.getTime())) {
          setError("Choose a valid schedule date and time");
          setSaving(false);
          return;
        }
        if (scheduled.getTime() <= Date.now() + 60_000) {
          setError("Schedule time must be at least 1 minute in the future");
          setSaving(false);
          return;
        }
        await scheduleEmail(tenantSlug, {
          ...buildPayload(),
          email_id: id,
          scheduled_at: scheduled.toISOString(),
        });
      } else {
        await sendEmail(tenantSlug, { ...buildPayload(), email_id: id, recipients });
      }
      onSent();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSaving(false);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between border-b border-[var(--border)] px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{TITLES[resolvedMode]}</h2>
            <p className="mt-0.5 text-sm text-zinc-500">{SUBTITLES[resolvedMode]}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Label className="w-14 shrink-0 text-xs font-medium uppercase tracking-wide text-zinc-500">To</Label>
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@company.com, team@org.com" className="flex-1" />
            {!showCc && (
              <button type="button" className="shrink-0 text-xs font-medium text-[var(--primary)] hover:underline" onClick={() => setShowCc(true)}>Cc</button>
            )}
            {!showBcc && (
              <button type="button" className="shrink-0 text-xs font-medium text-[var(--primary)] hover:underline" onClick={() => setShowBcc(true)}>Bcc</button>
            )}
          </div>
          {showCc && (
            <div className="flex items-center gap-3">
              <Label className="w-14 shrink-0 text-xs font-medium uppercase tracking-wide text-zinc-500">Cc</Label>
              <Input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="Optional" className="flex-1" />
            </div>
          )}
          {showBcc && (
            <div className="flex items-center gap-3">
              <Label className="w-14 shrink-0 text-xs font-medium uppercase tracking-wide text-zinc-500">Bcc</Label>
              <Input value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="Optional" className="flex-1" />
            </div>
          )}
          <div className="flex items-center gap-3">
            <Label className="w-14 shrink-0 text-xs font-medium uppercase tracking-wide text-zinc-500">Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject" className="flex-1" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              value={templateId}
              onChange={(e) => applyTemplate(e.target.value)}
            >
              <option value="">Use template...</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <select
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
            >
              {EMAIL_PRIORITIES.map((p) => (
                <option key={p} value={p}>{PRIORITY_LABELS[p] ?? p}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-1.5">
              <Calendar className="h-4 w-4 text-zinc-500" />
              <Input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                className="h-8 w-auto border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                title="Schedule send"
              />
            </div>
          </div>
          <RichTextEditor value={bodyHtml} onChange={setBodyHtml} minHeight="240px" />
          <div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[var(--border)] px-3 py-2 text-sm text-zinc-500 transition hover:border-[var(--primary)]/40 hover:bg-[var(--surface-muted)]/50 hover:text-[var(--foreground)]">
              <Paperclip className="h-4 w-4" />
              Attach files
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(e) => setAttachments((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
              />
            </label>
            {attachments.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {attachments.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/50 px-3 py-1.5 text-xs"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-zinc-500" />
                    <span className="max-w-[180px] truncate">{f.name}</span>
                    <button type="button" className="text-zinc-500 hover:text-red-600" onClick={() => removeAttachment(i)} aria-label={`Remove ${f.name}`}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border)] px-6 py-4">
          <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={saving}>
            Save draft
          </Button>
          <Button type="button" onClick={handleSend} disabled={saving}>
            <Send className="h-4 w-4" />
            {saving ? "Sending..." : scheduleAt ? "Schedule" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
