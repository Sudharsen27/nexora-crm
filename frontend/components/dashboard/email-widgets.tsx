"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Mail } from "lucide-react";
import { WidgetEmpty, WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { formatEmailDate, listEmails, recipientSummary } from "@/lib/api/emails";
import type { Email } from "@/types/email";

interface RecentEmailsWidgetProps {
  tenantSlug: string;
}

export function RecentEmailsWidget({ tenantSlug }: RecentEmailsWidgetProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEmails(tenantSlug, { folder: "sent", page_size: 5 })
      .then((r) => setEmails(r.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [tenantSlug]);

  if (loading) return <WidgetSkeleton variant="list" />;
  if (error) return <WidgetError title="Recent emails" message={error} onRetry={() => window.location.reload()} />;
  if (!emails.length) return <WidgetEmpty title="No recent emails" description="Sent emails will appear here." />;

  return (
    <ul className="space-y-2">
      {emails.map((email) => (
        <li key={email.id}>
          <Link
            href={`/${tenantSlug}/emails/${email.id}`}
            className="flex items-start gap-3 rounded-lg border border-[var(--border)]/60 px-3 py-2.5 transition hover:bg-[var(--surface-muted)]/50"
          >
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-600">
              <Mail className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{email.subject || "(no subject)"}</span>
              <span className="block truncate text-xs text-[var(--muted-foreground)]">{recipientSummary(email)}</span>
            </span>
            <span className="shrink-0 text-xs text-[var(--muted-foreground)]">
              {formatEmailDate(email.sent_at ?? email.created_at)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

interface ScheduledEmailsWidgetProps {
  tenantSlug: string;
}

export function ScheduledEmailsWidget({ tenantSlug }: ScheduledEmailsWidgetProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listEmails(tenantSlug, { folder: "scheduled", page_size: 5 })
      .then((r) => setEmails(r.items))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [tenantSlug]);

  if (loading) return <WidgetSkeleton variant="list" />;
  if (error) return <WidgetError title="Scheduled emails" message={error} onRetry={() => window.location.reload()} />;
  if (!emails.length) return <WidgetEmpty title="No scheduled emails" description="Schedule sends from the compose window." />;

  return (
    <ul className="space-y-2">
      {emails.map((email) => (
        <li key={email.id}>
          <Link
            href={`/${tenantSlug}/emails/${email.id}`}
            className="flex items-start gap-3 rounded-lg border border-[var(--border)]/60 px-3 py-2.5 transition hover:bg-[var(--surface-muted)]/50"
          >
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
              <Clock className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{email.subject}</span>
              <span className="block text-xs text-[var(--muted-foreground)]">
                {formatEmailDate(email.scheduled_at)}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
