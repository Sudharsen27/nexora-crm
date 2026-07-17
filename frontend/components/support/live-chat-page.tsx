"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Headphones, MessageSquare, Send, Star, UserPlus } from "lucide-react";
import { SupportNavTabs } from "@/components/support/support-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSupportChats } from "@/hooks/use-support";
import { usePermissions } from "@/contexts/permissions-context";
import {
  CHANNEL_LABELS,
  formatDateTime,
  getChat,
  getTicket,
  rateChat,
  resolveChat,
  sendChatMessage,
  startChat,
  transferChat,
} from "@/lib/api/support";
import type { ChatMessage, SupportChat } from "@/types/support";
import type { Member } from "@/types/api";
import { cn } from "@/lib/utils";
import { listMembers } from "@/lib/api/tenants";

interface LiveChatPageProps {
  tenantSlug: string;
}

export function LiveChatPage({ tenantSlug }: LiveChatPageProps) {
  const searchParams = useSearchParams();
  const chatParam = searchParams.get("chat");
  const { canWrite, loading: permLoading } = usePermissions();
  const canEdit = !permLoading && canWrite("support");

  const { data, loading, error, refresh } = useSupportChats(tenantSlug, { page_size: 50 });
  const [activeChat, setActiveChat] = useState<SupportChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [transferId, setTransferId] = useState("");
  const [rating, setRating] = useState(5);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void listMembers(tenantSlug).then(setMembers);
  }, [tenantSlug]);

  const loadChat = useCallback(
    async (chatId: string) => {
      try {
        const chat = await getChat(tenantSlug, chatId);
        setActiveChat(chat);
        if (chat.ticket_id) {
          const ticket = await getTicket(tenantSlug, chat.ticket_id);
          setMessages(
            ticket.replies.map((r) => ({
              id: r.id,
              conversation_id: chatId,
              author_type: r.author_type,
              author_id: r.staff_user_id,
              author_name: r.author_name,
              message_type: "text",
              body: r.body,
              is_internal: r.is_internal,
              created_at: r.created_at,
            })),
          );
        } else {
          setMessages([]);
        }
      } catch {
        setActiveChat(null);
        setMessages([]);
      }
    },
    [tenantSlug],
  );

  useEffect(() => {
    if (chatParam) void loadChat(chatParam);
  }, [chatParam, loadChat]);

  useEffect(() => {
    if (!chatParam && data?.items[0]) void loadChat(data.items[0].id);
  }, [data, chatParam, loadChat]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeChat || !messageBody.trim() || !canEdit) return;
    setBusy(true);
    try {
      const msg = await sendChatMessage(tenantSlug, activeChat.id, { body: messageBody.trim() });
      setMessages((prev) => [...prev, msg]);
      setMessageBody("");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) return <WidgetSkeleton variant="chart" />;
  if (error) {
    return <WidgetError title="Live Chat" message={error} onRetry={() => void refresh()} />;
  }

  const chats = data?.items ?? [];

  return (
    <div className="space-y-6 pb-8">
      <div>
        <div className="flex items-center gap-2">
          <Headphones className="h-6 w-6 text-violet-500" />
          <h1 className="text-2xl font-bold">Live Chat</h1>
        </div>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">Real-time customer conversations</p>
      </div>

      <SupportNavTabs tenantSlug={tenantSlug} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-[var(--border)]/80 bg-[var(--surface)]/80 backdrop-blur-sm lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Conversations</CardTitle>
            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void startChat(tenantSlug, { channel: "live_chat" }).then((c) => {
                    void loadChat(c.id);
                    void refresh();
                  })
                }
              >
                New
              </Button>
            )}
          </CardHeader>
          <CardContent className="max-h-[520px] space-y-2 overflow-y-auto p-2">
            {chats.length === 0 ? (
              <p className="p-4 text-center text-sm text-[var(--muted-foreground)]">No active chats</p>
            ) : (
              chats.map((chat) => (
                <button
                  key={chat.id}
                  type="button"
                  onClick={() => void loadChat(chat.id)}
                  className={cn(
                    "w-full rounded-lg border p-3 text-left transition",
                    activeChat?.id === chat.id
                      ? "border-violet-500/50 bg-violet-500/10"
                      : "border-[var(--border)] hover:bg-[var(--surface-muted)]",
                  )}
                >
                  <p className="font-medium">{chat.visitor_name ?? chat.assigned_to?.full_name ?? "Visitor"}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {CHANNEL_LABELS[chat.channel] ?? chat.channel} · {chat.message_count} msgs
                  </p>
                  <Badge variant="outline" className="mt-1 capitalize">{chat.status}</Badge>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-[var(--border)]/80 bg-[var(--surface)]/80 backdrop-blur-sm lg:col-span-2">
          {activeChat ? (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-4 w-4" />
                  {activeChat.visitor_name ?? activeChat.visitor_email ?? "Conversation"}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="max-h-80 space-y-3 overflow-y-auto rounded-lg border border-[var(--border)] p-3">
                  {messages.length === 0 ? (
                    <p className="text-center text-sm text-[var(--muted-foreground)]">
                      {activeChat.message_count > 0
                        ? "Send a message to continue the conversation"
                        : "No messages yet"}
                    </p>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "rounded-lg p-3 text-sm",
                          msg.author_type === "agent"
                            ? "ml-8 bg-violet-500/10"
                            : "mr-8 bg-[var(--surface-muted)]",
                        )}
                      >
                        <p className="text-xs font-medium">{msg.author_name ?? msg.author_type}</p>
                        <p className="mt-1">{msg.body}</p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{formatDateTime(msg.created_at)}</p>
                      </div>
                    ))
                  )}
                </div>

                {canEdit && activeChat.status !== "resolved" && (
                  <form onSubmit={(e) => void handleSend(e)} className="flex gap-2">
                    <input
                      value={messageBody}
                      onChange={(e) => setMessageBody(e.target.value)}
                      placeholder="Type a message…"
                      className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                    />
                    <Button type="submit" disabled={busy || !messageBody.trim()} className="bg-violet-600 hover:bg-violet-700">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                )}

                {canEdit && (
                  <div className="flex flex-wrap items-end gap-2 border-t border-[var(--border)] pt-4">
                    <select
                      className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
                      value={transferId}
                      onChange={(e) => setTransferId(e.target.value)}
                    >
                      <option value="">Transfer to…</option>
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>{m.full_name}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!transferId}
                      onClick={() =>
                        void transferChat(tenantSlug, activeChat.id, transferId).then((c) => {
                          setActiveChat(c);
                          void refresh();
                        })
                      }
                    >
                      <UserPlus className="mr-1 h-3 w-3" />
                      Transfer
                    </Button>
                    {activeChat.status !== "resolved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void resolveChat(tenantSlug, activeChat.id).then((c) => {
                            setActiveChat(c);
                            void refresh();
                          })
                        }
                      >
                        Resolve
                      </Button>
                    )}
                    {activeChat.status === "resolved" && !activeChat.rating && (
                      <>
                        <select
                          className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 text-sm"
                          value={rating}
                          onChange={(e) => setRating(Number(e.target.value))}
                        >
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>{n} stars</option>
                          ))}
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void rateChat(tenantSlug, activeChat.id, rating).then((c) => setActiveChat(c))
                          }
                        >
                          <Star className="mr-1 h-3 w-3" />
                          Rate
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="py-16 text-center text-[var(--muted-foreground)]">
              Select a conversation to start
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
