"use client";

import { Inbox, Mail, Paperclip, PenSquare, Star } from "lucide-react";
import {
  emailInitials,
  emailSenderDisplay,
  FOLDER_LABELS,
  formatEmailDate,
  recipientSummary,
} from "@/lib/api/emails";
import type { Email, EmailFolder } from "@/types/email";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmailListProps {
  emails: Email[];
  selectedId?: string | null;
  folder?: EmailFolder | string;
  onSelect: (id: string) => void;
  loading?: boolean;
  onCompose?: () => void;
}

const EMPTY_HINTS: Record<string, string> = {
  inbox: "Incoming messages linked to your CRM will appear here.",
  sent: "Emails you send from the CRM will show up in this folder.",
  drafts: "Save a draft while composing to continue later.",
  scheduled: "Schedule a send from the compose window to plan ahead.",
  starred: "Star important emails to find them quickly.",
  archive: "Archived emails are stored here for reference.",
  trash: "Deleted emails are kept here before permanent removal.",
};

export function EmailList({ emails, selectedId, folder = "inbox", onSelect, loading, onCompose }: EmailListProps) {
  if (loading) {
    return (
      <div className="p-4">
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--surface-muted)]" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded-lg bg-[var(--surface-muted)]" />
                <div className="h-3 w-1/2 rounded-lg bg-[var(--surface-muted)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!emails.length) {
    const folderLabel = FOLDER_LABELS[folder] ?? "folder";
    return (
      <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
        <span className="mb-3 inline-flex rounded-2xl bg-[var(--primary)]/10 p-3 text-[var(--primary)]">
          <Inbox className="h-5 w-5" aria-hidden />
        </span>
        <p className="text-base font-medium text-[var(--foreground)]">No emails in {folderLabel.toLowerCase()}</p>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">
          {EMPTY_HINTS[folder] ?? "Compose a new email to get started."}
        </p>
        {onCompose && (
          <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onCompose}>
            <PenSquare className="h-4 w-4" />
            Compose email
          </Button>
        )}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[var(--border)]">
      {emails.map((email) => {
        const active = selectedId === email.id;
        const sender = emailSenderDisplay(email);
        const isSentFolder = folder === "sent" || email.direction === "outbound";
        const primaryLine = isSentFolder ? recipientSummary(email) : sender;

        return (
          <li key={email.id}>
            <button
              type="button"
              onClick={() => onSelect(email.id)}
              className={cn(
                "flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-[var(--surface-muted)]/60",
                active && "bg-[var(--primary)]/5",
              )}
            >
              <div className="relative shrink-0">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/15 to-violet-500/15 text-xs font-semibold text-[var(--primary)]">
                  {emailInitials(email)}
                </span>
                {!email.is_read && (
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface)] bg-sky-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("truncate text-sm", !email.is_read ? "font-semibold text-[var(--foreground)]" : "text-[var(--foreground)]")}>
                    {primaryLine}
                  </span>
                  {email.is_starred && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                  {email.has_attachments && <Paperclip className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />}
                  <span className="ml-auto shrink-0 text-xs text-zinc-500">
                    {formatEmailDate(email.sent_at ?? email.scheduled_at ?? email.updated_at)}
                  </span>
                </div>
                <p className={cn("mt-0.5 truncate text-sm", !email.is_read ? "font-medium text-[var(--foreground)]" : "text-[var(--foreground)]")}>
                  {email.subject || "(no subject)"}
                </p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-zinc-500">
                  <Mail className="h-3 w-3 shrink-0 opacity-60" />
                  {email.body_text?.slice(0, 100) || "—"}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
