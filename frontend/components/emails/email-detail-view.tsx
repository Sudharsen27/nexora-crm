"use client";

import Link from "next/link";
import {
  Archive,
  Building2,
  Briefcase,
  Contact,
  Download,
  Forward,
  Reply,
  Star,
  Trash2,
  UserRoundPlus,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmailComposeDialog } from "@/components/emails/email-compose-dialog";
import { usePermissions } from "@/contexts/permissions-context";
import {
  archiveEmail,
  emailInitials,
  emailSenderDisplay,
  formatEmailDate,
  formatFileSize,
  PRIORITY_LABELS,
  recipientSummary,
  starEmail,
  STATUS_LABELS,
  trashEmail,
} from "@/lib/api/emails";
import { API_BASE } from "@/lib/api/client";
import type { Email } from "@/types/email";
import { cn } from "@/lib/utils";

interface EmailDetailViewProps {
  tenantSlug: string;
  email: Email;
  onChanged: () => void;
}

function priorityClass(priority: string): string {
  if (priority === "urgent") return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
  if (priority === "high") return "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300";
  if (priority === "low") return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
  return "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300";
}

export function EmailDetailView({ tenantSlug, email, onChanged }: EmailDetailViewProps) {
  const { canWrite, canDelete } = usePermissions();
  const [replyOpen, setReplyOpen] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);

  const crmLinks = [
    { id: email.contact_id, href: `/contacts/${email.contact_id}`, label: "Contact", icon: Contact },
    { id: email.lead_id, href: `/leads/${email.lead_id}`, label: "Lead", icon: UserRoundPlus },
    { id: email.deal_id, href: `/deals/${email.deal_id}`, label: "Deal", icon: Briefcase },
    { id: email.company_id, href: `/companies/${email.company_id}`, label: "Company", icon: Building2 },
  ].filter((l) => l.id);

  const handleTrash = async () => {
    if (!confirm("Move this email to trash?")) return;
    await trashEmail(tenantSlug, email.id);
    onChanged();
  };

  const sentDate = email.sent_at ?? email.scheduled_at ?? email.created_at;

  return (
    <div className="flex h-full min-h-[420px] flex-col">
      <div className="border-b border-[var(--border)] px-5 py-5">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/15 to-violet-500/15 text-sm font-semibold text-[var(--primary)]">
            {emailInitials(email)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">{email.subject || "(no subject)"}</h2>
              <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", priorityClass(email.priority))}>
                {PRIORITY_LABELS[email.priority] ?? email.priority}
              </span>
              <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 text-xs font-medium text-zinc-600">
                {STATUS_LABELS[email.status] ?? email.status}
              </span>
            </div>
            <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{emailSenderDisplay(email)}</p>
            <p className="mt-0.5 text-sm text-zinc-500">
              To {recipientSummary(email)}
              {sentDate ? ` · ${formatEmailDate(sentDate)}` : ""}
            </p>
            {email.recipients.length > 1 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {email.recipients.map((r) => (
                  <span
                    key={r.id ?? `${r.recipient_type}-${r.email_address}`}
                    className="rounded-md bg-[var(--surface-muted)] px-2 py-0.5 text-xs text-zinc-600"
                  >
                    {r.recipient_type.toUpperCase()}: {r.display_name || r.email_address}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {canWrite("email") && (
          <div className="mt-4 flex flex-wrap gap-1 border-t border-[var(--border)] pt-4">
            <Button type="button" variant="outline" size="sm" onClick={() => setReplyOpen(true)}>
              <Reply className="h-4 w-4" />
              Reply
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setForwardOpen(true)}>
              <Forward className="h-4 w-4" />
              Forward
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async () => { await starEmail(tenantSlug, email.id, !email.is_starred); onChanged(); }}
            >
              <Star className={cn("h-4 w-4", email.is_starred && "fill-amber-400 text-amber-400")} />
              {email.is_starred ? "Unstar" : "Star"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async () => { await archiveEmail(tenantSlug, email.id, !email.archived_at); onChanged(); }}
            >
              <Archive className="h-4 w-4" />
              {email.archived_at ? "Unarchive" : "Archive"}
            </Button>
            {canDelete("email") && (
              <Button type="button" variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => void handleTrash()}>
                <Trash2 className="h-4 w-4" />
                Trash
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div
          className="prose prose-sm max-w-none text-[var(--foreground)]"
          dangerouslySetInnerHTML={{ __html: email.body_html || `<p>${email.body_text ?? ""}</p>` }}
        />

        {email.attachments.length > 0 && (
          <div className="mt-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Attachments ({email.attachments.length})
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {email.attachments.map((a) => (
                <li key={a.id}>
                  <a
                    href={`${API_BASE}/tenants/${tenantSlug}/emails/${email.id}/attachments/${a.id}`}
                    className="flex items-center gap-3 rounded-xl border border-[var(--border)] px-4 py-3 text-sm transition hover:bg-[var(--surface-muted)]/50"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                      <Download className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{a.filename}</span>
                      <span className="text-xs text-zinc-500">{formatFileSize(a.size_bytes)}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {crmLinks.length > 0 && (
          <div className="mt-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Linked CRM records</p>
            <div className="flex flex-wrap gap-2">
              {crmLinks.map((link) => (
                <Link key={link.label} href={`/${tenantSlug}${link.href}`}>
                  <Button type="button" variant="outline" size="sm">
                    <link.icon className="h-3.5 w-3.5" />
                    {link.label}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}

        {email.logs.length > 0 && (
          <div className="mt-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Engagement timeline</p>
            <ul className="space-y-3 border-l-2 border-[var(--border)] pl-4">
              {email.logs.map((log) => (
                <li key={log.id} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface)] bg-[var(--primary)]" />
                  <span className="font-medium capitalize">{log.event_type.replace(/_/g, " ")}</span>
                  <span className="ml-2 text-xs text-zinc-500">{formatEmailDate(log.created_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <EmailComposeDialog
        open={replyOpen}
        tenantSlug={tenantSlug}
        mode="reply"
        replyTo={email}
        onClose={() => setReplyOpen(false)}
        onSent={onChanged}
      />
      <EmailComposeDialog
        open={forwardOpen}
        tenantSlug={tenantSlug}
        mode="forward"
        initial={{ subject: `Fwd: ${email.subject}`, body_html: email.body_html ?? undefined }}
        onClose={() => setForwardOpen(false)}
        onSent={onChanged}
      />
    </div>
  );
}
