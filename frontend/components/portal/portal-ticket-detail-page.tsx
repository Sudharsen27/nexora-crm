"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PortalPageError, PortalPageLoading } from "@/components/portal/portal-page-state";
import { getPortalTicket, replyPortalTicket } from "@/lib/api/portal";
import type { PortalTicketDetail } from "@/types/portal";

export function PortalTicketDetailPage({ tenantSlug, ticketId }: { tenantSlug: string; ticketId: string }) {
  const [ticket, setTicket] = useState<PortalTicketDetail | null>(null);
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = () => {
    setLoading(true);
    void getPortalTicket(tenantSlug, ticketId)
      .then(setTicket)
      .catch((e) => setError(e instanceof Error ? e.message : "Ticket not found"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [tenantSlug, ticketId]);

  if (loading) return <PortalPageLoading label="Loading ticket…" />;
  if (error || !ticket) return <PortalPageError message={error ?? "Ticket not found"} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/portal/${tenantSlug}/support`}
        className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to support
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{ticket.subject}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {ticket.status} · {ticket.priority} · {ticket.category}
        </p>
      </div>

      <Card>
        <CardContent className="p-4 text-sm whitespace-pre-wrap">{ticket.description}</CardContent>
      </Card>

      <div className="space-y-3">
        {ticket.replies.map((r) => (
          <Card key={r.id} className={r.author_type === "portal" ? "border-sky-500/20" : "border-emerald-500/20"}>
            <CardContent className="p-4">
              <p className="text-xs font-medium text-[var(--muted-foreground)]">
                {r.author_name} · {r.author_type === "staff" ? "Account team" : "You"} ·{" "}
                {new Date(r.created_at).toLocaleString()}
              </p>
              <p className="mt-1 text-sm whitespace-pre-wrap">{r.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {ticket.status !== "closed" && (
        <div className="space-y-2">
          <textarea
            className="min-h-20 w-full rounded-xl border border-[var(--border)] bg-[var(--background)] p-3 text-sm"
            placeholder="Write a reply…"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          <Button
            className="bg-sky-600 hover:bg-sky-700"
            disabled={!reply.trim() || sending}
            onClick={() => {
              setSending(true);
              void replyPortalTicket(tenantSlug, ticketId, reply)
                .then(() => {
                  setReply("");
                  load();
                })
                .catch((e) => setError(e instanceof Error ? e.message : "Failed to send reply"))
                .finally(() => setSending(false));
            }}
          >
            {sending ? "Sending…" : "Send reply"}
          </Button>
        </div>
      )}
    </div>
  );
}
