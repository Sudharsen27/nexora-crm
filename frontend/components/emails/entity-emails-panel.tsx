"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, PenSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WidgetEmpty } from "@/components/dashboard/widget-states";
import { EmailComposeDialog } from "@/components/emails/email-compose-dialog";
import { formatEmailDate, listEmails, recipientSummary } from "@/lib/api/emails";
import type { Email } from "@/types/email";

interface EntityEmailsPanelProps {
  tenantSlug: string;
  entityType: "contact" | "lead" | "deal" | "company";
  entityId: string;
  canWrite?: boolean;
  embedded?: boolean;
}

export function EntityEmailsPanel({
  tenantSlug,
  entityType,
  entityId,
  canWrite = false,
  embedded = false,
}: EntityEmailsPanelProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);

  const load = () => {
    setLoading(true);
    listEmails(tenantSlug, { entity_type: entityType, entity_id: entityId, page_size: 8 })
      .then((r) => setEmails(r.items))
      .catch(() => setEmails([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [tenantSlug, entityType, entityId]);

  const composeInitial = {
    [`${entityType}_id`]: entityId,
  } as Record<string, string>;

  return (
    <div className="space-y-4">
      {!embedded && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Emails</h3>
          {canWrite && (
            <Button type="button" variant="outline" size="sm" onClick={() => setComposeOpen(true)}>
              <PenSquare className="h-3.5 w-3.5" />
              Compose
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-[var(--surface-muted)]" />
          ))}
        </div>
      ) : emails.length === 0 ? (
        <WidgetEmpty
          title="No emails yet"
          description={`Emails sent or linked to this ${entityType} will appear here.`}
          className="py-10"
        />
      ) : (
        <>
          <ul className="space-y-2">
            {emails.map((email) => (
              <li key={email.id}>
                <Link
                  href={`/${tenantSlug}/emails/${email.id}`}
                  className="flex items-start gap-3 rounded-xl border border-[var(--border)] px-4 py-3 transition hover:bg-[var(--surface-muted)]/50"
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                    <Mail className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{email.subject || "(no subject)"}</span>
                    <span className="block truncate text-xs text-zinc-500">{recipientSummary(email)}</span>
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500">
                    {formatEmailDate(email.sent_at ?? email.created_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={`/${tenantSlug}/emails?folder=sent`}
            className="inline-block text-sm font-medium text-[var(--primary)] hover:underline"
          >
            View all emails →
          </Link>
        </>
      )}

      {embedded && canWrite && (
        <Button type="button" size="sm" onClick={() => setComposeOpen(true)}>
          <PenSquare className="h-4 w-4" />
          Compose email
        </Button>
      )}

      <EmailComposeDialog
        open={composeOpen}
        tenantSlug={tenantSlug}
        initial={composeInitial}
        onClose={() => setComposeOpen(false)}
        onSent={load}
      />
    </div>
  );
}
