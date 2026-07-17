"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Archive,
  ArrowLeft,
  Bot,
  MessageSquare,
  RotateCcw,
  Send,
  Sparkles,
  UserPlus,
  XCircle,
} from "lucide-react";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSupportTicket } from "@/hooks/use-support";
import { usePermissions } from "@/contexts/permissions-context";
import {
  addReply,
  aiAssist,
  archiveTicket,
  assignTicket,
  closeTicket,
  escalateTicket,
  formatDateTime,
  formatTicketNumber,
  isSlaOverdue,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  reopenTicket,
  STATUS_COLORS,
  STATUS_LABELS,
} from "@/lib/api/support";
import { listMembers } from "@/lib/api/tenants";
import type { Member } from "@/types/api";
import type { AiAssistResponse } from "@/types/support";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface TicketDetailPageProps {
  tenantSlug: string;
  ticketId: string;
}

const AI_ACTIONS = [
  { type: "classification", label: "Classify" },
  { type: "sentiment", label: "Sentiment" },
  { type: "summary", label: "Summary" },
  { type: "reply", label: "Reply Suggestion" },
  { type: "escalate", label: "Escalate Check" },
] as const;

export function TicketDetailPage({ tenantSlug, ticketId }: TicketDetailPageProps) {
  const { data: ticket, loading, error, refresh } = useSupportTicket(tenantSlug, ticketId);
  const { canWrite, loading: permLoading } = usePermissions();
  const canEdit = !permLoading && canWrite("support");

  const [replyBody, setReplyBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [assigneeId, setAssigneeId] = useState("");
  const [aiResult, setAiResult] = useState<AiAssistResponse | null>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void listMembers(tenantSlug).then(setMembers);
  }, [tenantSlug]);

  useEffect(() => {
    if (ticket?.assigned_to_id) setAssigneeId(ticket.assigned_to_id);
  }, [ticket?.assigned_to_id]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyBody.trim() || !canEdit) return;
    setSubmitting(true);
    try {
      await addReply(tenantSlug, ticketId, { body: replyBody.trim(), is_internal: isInternal });
      setReplyBody("");
      setIsInternal(false);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setSubmitting(false);
    }
  }

  async function runAi(assistType: string) {
    setAiLoading(assistType);
    try {
      const result = await aiAssist(tenantSlug, ticketId, assistType);
      setAiResult(result);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "AI assist failed");
    } finally {
      setAiLoading(null);
    }
  }

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error || !ticket) {
    return (
      <WidgetError
        title="Ticket"
        message={error ?? "Ticket not found"}
        onRetry={() => void refresh()}
      />
    );
  }

  const contactName = ticket.contact
    ? `${ticket.contact.first_name} ${ticket.contact.last_name}`.trim()
    : null;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/${tenantSlug}/support/tickets`}
          className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to tickets
        </Link>
      </div>

      <div>
        <p className="font-mono text-sm text-violet-600">{formatTicketNumber(ticket)}</p>
        <h1 className="text-2xl font-bold">{ticket.subject}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_COLORS[ticket.status])}>
            {STATUS_LABELS[ticket.status] ?? ticket.status}
          </span>
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", PRIORITY_COLORS[ticket.priority])}>
            {PRIORITY_LABELS[ticket.priority]}
          </span>
          {ticket.sla_breached && <Badge variant="destructive">SLA Breached</Badge>}
          {isSlaOverdue(ticket) && <Badge variant="destructive">Overdue</Badge>}
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-sm">{message}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="border-[var(--border)]/80 bg-[var(--surface)]/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" />
                Conversation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)]/50 p-4">
                <p className="text-xs text-[var(--muted-foreground)]">Original request · {formatDateTime(ticket.created_at)}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{ticket.description}</p>
              </div>

              {ticket.replies.map((reply) => (
                <div
                  key={reply.id}
                  className={cn(
                    "rounded-lg border p-4",
                    reply.is_internal
                      ? "border-amber-500/30 bg-amber-500/5"
                      : reply.author_type === "customer"
                        ? "border-[var(--border)] bg-[var(--surface)]"
                        : "border-violet-500/20 bg-violet-500/5",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {reply.author_name ?? reply.author_type}
                      {reply.is_internal && (
                        <span className="ml-2 text-xs text-amber-600">Internal note</span>
                      )}
                      {reply.is_ai_generated && (
                        <span className="ml-2 text-xs text-violet-600">AI</span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">{formatDateTime(reply.created_at)}</p>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{reply.body}</p>
                </div>
              ))}

              {canEdit && (
                <form onSubmit={(e) => void handleReply(e)} className="space-y-3 border-t border-[var(--border)] pt-4">
                  <textarea
                    rows={3}
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Write a reply…"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                      Internal note
                    </label>
                    <Button type="submit" disabled={submitting || !replyBody.trim()} className="bg-violet-600 hover:bg-violet-700">
                      <Send className="mr-2 h-4 w-4" />
                      Send
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <Card className="border-violet-500/10 bg-gradient-to-br from-violet-500/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-violet-500" />
                AI Assist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {AI_ACTIONS.map((action) => (
                  <Button
                    key={action.type}
                    variant="outline"
                    size="sm"
                    disabled={aiLoading !== null}
                    onClick={() => void runAi(action.type)}
                  >
                    <Bot className="mr-1 h-3 w-3" />
                    {aiLoading === action.type ? "…" : action.label}
                  </Button>
                ))}
              </div>
              {aiResult && (
                <div className="space-y-2 rounded-lg border border-[var(--border)] p-3 text-sm">
                  {aiResult.summary && <p><strong>Summary:</strong> {aiResult.summary}</p>}
                  {aiResult.classification && <p><strong>Classification:</strong> {aiResult.classification}</p>}
                  {aiResult.sentiment && <p><strong>Sentiment:</strong> {aiResult.sentiment}</p>}
                  {aiResult.priority_suggestion && <p><strong>Priority:</strong> {aiResult.priority_suggestion}</p>}
                  {aiResult.reply_suggestion && (
                    <div>
                      <strong>Reply suggestion:</strong>
                      <p className="mt-1 whitespace-pre-wrap text-[var(--muted-foreground)]">{aiResult.reply_suggestion}</p>
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={() => setReplyBody(aiResult.reply_suggestion ?? "")}
                        >
                          Use suggestion
                        </Button>
                      )}
                    </div>
                  )}
                  {aiResult.escalate_recommendation && (
                    <p className="text-amber-600">
                      Escalation recommended: {aiResult.escalate_reason}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-[var(--border)]/80 bg-[var(--surface)]/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <DetailRow label="Assignee" value={ticket.assigned_to?.full_name ?? "Unassigned"} />
              <DetailRow label="Contact" value={contactName ?? "—"} />
              <DetailRow label="Company" value={ticket.company?.company_name ?? "—"} />
              <DetailRow label="Category" value={ticket.category.replace(/_/g, " ")} />
              <DetailRow label="Channel" value={ticket.channel} />
              <DetailRow label="Escalation" value={ticket.escalation_level.replace(/_/g, " ")} />
              {ticket.tags.length > 0 && (
                <div>
                  <p className="text-[var(--muted-foreground)]">Tags</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {ticket.tags.map((tag) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-[var(--border)]/80 bg-[var(--surface)]/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base">SLA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <DetailRow label="Response due" value={formatDateTime(ticket.response_due_at)} />
              <DetailRow label="Resolution due" value={formatDateTime(ticket.resolution_due_at)} />
              <DetailRow label="First response" value={formatDateTime(ticket.first_response_at)} />
              <DetailRow label="Resolved" value={formatDateTime(ticket.resolved_at)} />
            </CardContent>
          </Card>

          {canEdit && (
            <Card className="border-[var(--border)]/80 bg-[var(--surface)]/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <select
                    className="h-9 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                  >
                    <option value="">Select agent…</option>
                    {members.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!assigneeId}
                    onClick={() =>
                      void assignTicket(tenantSlug, ticketId, assigneeId).then(() => refresh())
                    }
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ticket.status !== "closed" && ticket.status !== "resolved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void closeTicket(tenantSlug, ticketId).then(() => refresh())}
                    >
                      <XCircle className="mr-1 h-3 w-3" />
                      Close
                    </Button>
                  )}
                  {(ticket.status === "closed" || ticket.status === "resolved") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void reopenTicket(tenantSlug, ticketId).then(() => refresh())}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Reopen
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void escalateTicket(tenantSlug, ticketId).then(() => refresh())
                    }
                  >
                    Escalate
                  </Button>
                  {!ticket.is_archived && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void archiveTicket(tenantSlug, ticketId).then(() => refresh())}
                    >
                      <Archive className="mr-1 h-3 w-3" />
                      Archive
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className="text-right font-medium capitalize">{value}</span>
    </div>
  );
}
