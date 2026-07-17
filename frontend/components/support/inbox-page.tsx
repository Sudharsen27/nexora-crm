"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Inbox, MessageSquare, Send } from "lucide-react";
import { SupportNavTabs } from "@/components/support/support-nav-tabs";
import { WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermissions } from "@/contexts/permissions-context";
import {
  addReply,
  CHANNEL_LABELS,
  formatDateTime,
  formatTicketNumber,
  getTicket,
  listTickets,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
} from "@/lib/api/support";
import type { SupportTicket, SupportTicketDetail } from "@/types/support";
import { cn } from "@/lib/utils";

const INBOX_CHANNELS = ["email", "live_chat", "whatsapp", "portal", "phone", "sms"] as const;

interface InboxPageProps {
  tenantSlug: string;
}

export function InboxPage({ tenantSlug }: InboxPageProps) {
  const { canWrite, loading: permLoading } = usePermissions();
  const canEdit = !permLoading && canWrite("support");

  const [channel, setChannel] = useState<string>("email");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SupportTicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listTickets(tenantSlug, {
        channel,
        is_archived: false,
        page_size: 50,
        page: 1,
      });
      setTickets(data.items);
      if (data.items.length > 0 && !selectedId) {
        setSelectedId(data.items[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, channel, selectedId]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    void getTicket(tenantSlug, selectedId).then(setDetail).catch(() => setDetail(null));
  }, [tenantSlug, selectedId]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !replyBody.trim() || !canEdit) return;
    setSubmitting(true);
    try {
      await addReply(tenantSlug, selectedId, { body: replyBody.trim(), is_internal: false });
      setReplyBody("");
      const updated = await getTicket(tenantSlug, selectedId);
      setDetail(updated);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <div className="flex items-center gap-2">
          <Inbox className="h-6 w-6 text-violet-500" />
          <h1 className="text-2xl font-bold">Omnichannel Inbox</h1>
        </div>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Unified view across email, chat, WhatsApp, portal, and more
        </p>
      </div>

      <SupportNavTabs tenantSlug={tenantSlug} />

      <div className="flex flex-wrap gap-2">
        {INBOX_CHANNELS.map((ch) => (
          <Button
            key={ch}
            variant={channel === ch ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setChannel(ch);
              setSelectedId(null);
            }}
          >
            {CHANNEL_LABELS[ch] ?? ch}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-[var(--border)]/80 bg-[var(--surface)]/80 backdrop-blur-sm lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">{CHANNEL_LABELS[channel] ?? channel} Inbox</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[560px] space-y-1 overflow-y-auto p-2">
            {loading ? (
              <WidgetSkeleton variant="list" />
            ) : tickets.length === 0 ? (
              <p className="p-4 text-center text-sm text-[var(--muted-foreground)]">No tickets in this channel</p>
            ) : (
              tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => setSelectedId(ticket.id)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition",
                    selectedId === ticket.id
                      ? "border-violet-500/50 bg-violet-500/10"
                      : "border-[var(--border)] hover:bg-[var(--surface-muted)]",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-violet-600">{formatTicketNumber(ticket)}</span>
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", PRIORITY_COLORS[ticket.priority])}>
                      {PRIORITY_LABELS[ticket.priority]}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm font-medium">{ticket.subject}</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">{formatDateTime(ticket.updated_at)}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-[var(--border)]/80 bg-[var(--surface)]/80 backdrop-blur-sm lg:col-span-2">
          {detail ? (
            <>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{detail.subject}</CardTitle>
                    <p className="mt-1 font-mono text-xs text-violet-600">{formatTicketNumber(detail)}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[detail.status])}>
                      {STATUS_LABELS[detail.status]}
                    </span>
                    <Link
                      href={`/${tenantSlug}/support/tickets/${detail.id}`}
                      className="text-xs text-violet-600 hover:underline"
                    >
                      Open full view
                    </Link>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-96 space-y-3 overflow-y-auto">
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/50 p-3 text-sm">
                    <p className="text-xs text-[var(--muted-foreground)]">{formatDateTime(detail.created_at)}</p>
                    <p className="mt-1 whitespace-pre-wrap">{detail.description}</p>
                  </div>
                  {detail.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className={cn(
                        "rounded-lg border p-3 text-sm",
                        reply.is_internal ? "border-amber-500/30 bg-amber-500/5" : "border-[var(--border)]",
                      )}
                    >
                      <div className="flex justify-between gap-2">
                        <p className="font-medium">{reply.author_name ?? reply.author_type}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">{formatDateTime(reply.created_at)}</p>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap">{reply.body}</p>
                    </div>
                  ))}
                </div>

                {canEdit && detail.status !== "closed" && (
                  <form onSubmit={(e) => void handleReply(e)} className="flex gap-2 border-t border-[var(--border)] pt-4">
                    <textarea
                      rows={2}
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      placeholder="Reply to customer…"
                      className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                    />
                    <Button type="submit" disabled={submitting || !replyBody.trim()} className="bg-violet-600 hover:bg-violet-700">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center py-16 text-[var(--muted-foreground)]">
              <MessageSquare className="mb-2 h-8 w-8 opacity-50" />
              Select a conversation
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
