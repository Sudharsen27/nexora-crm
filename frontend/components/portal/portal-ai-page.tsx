"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Calendar,
  FileText,
  Handshake,
  HelpCircle,
  Sparkles,
  User,
} from "lucide-react";
import { AiMarkdown } from "@/components/ai/ai-markdown";
import { Button } from "@/components/ui/button";
import { PortalPageError } from "@/components/portal/portal-page-state";
import { streamPortalAi } from "@/lib/api/portal";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  {
    icon: Handshake,
    label: "Open deals",
    prompt: "What deals are open for my account?",
    gradient: "from-sky-500/10 to-cyan-500/10",
  },
  {
    icon: FileText,
    label: "Documents",
    prompt: "How do I upload a document?",
    gradient: "from-blue-500/10 to-indigo-500/10",
  },
  {
    icon: Calendar,
    label: "Meetings",
    prompt: "How do I request a meeting?",
    gradient: "from-teal-500/10 to-emerald-500/10",
  },
  {
    icon: HelpCircle,
    label: "Support",
    prompt: "What's the status of my support tickets?",
    gradient: "from-violet-500/10 to-purple-500/10",
  },
];

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

function PortalAiMessage({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl shadow-sm",
          isUser
            ? "bg-sky-600 text-white"
            : "bg-gradient-to-br from-sky-500 to-cyan-600 text-white",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>

      <div className={cn("min-w-0", isUser ? "max-w-[min(100%,32rem)]" : "max-w-[min(100%,42rem)]")}>
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 shadow-sm",
            isUser
              ? "border-sky-500/20 bg-gradient-to-br from-sky-600 to-cyan-600 text-white"
              : "border-[var(--border)] bg-[var(--surface)]",
          )}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed">{message.content}</p>
          ) : (
            <>
              {message.content ? (
                <AiMarkdown content={message.content} />
              ) : (
                <span className="text-sm text-[var(--muted-foreground)]">Thinking…</span>
              )}
              {message.streaming && message.content && (
                <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-sky-500 align-middle" />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function PortalAiPage({ tenantSlug }: { tenantSlug: string }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || streaming) return;
    setInput("");
    setError(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const next = [...messages, { role: "user" as const, content: message }];
    setMessages([...next, { role: "assistant", content: "", streaming: true }]);
    setStreaming(true);

    let accumulated = "";
    try {
      for await (const chunk of streamPortalAi(
        tenantSlug,
        next.map((m) => ({ role: m.role, content: m.content })),
      )) {
        accumulated += chunk;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: accumulated, streaming: true };
          return copy;
        });
      }

      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content:
            accumulated ||
            "I couldn't generate a response. Try asking about deals, meetings, documents, or support.",
          streaming: false,
        };
        return copy;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI request failed");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-7rem)] max-w-4xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]/50 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)]/90 px-5 py-4 backdrop-blur-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-md shadow-sky-500/20">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">AI Assistant</h1>
          <p className="text-xs text-[var(--muted-foreground)]">
            Answers about your deals, documents, meetings & support
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {error && (
          <div className="mb-4">
            <PortalPageError message={error} />
          </div>
        )}

        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-center">
            <div className="mb-8 text-center">
              <h2 className="text-xl font-bold tracking-tight">How can I help you today?</h2>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Ask anything about your customer portal account
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {SUGGESTIONS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.prompt}
                    type="button"
                    disabled={streaming}
                    onClick={() => void send(s.prompt)}
                    className={cn(
                      "group relative overflow-hidden rounded-2xl border border-[var(--border)] p-4 text-left transition-all",
                      "hover:-translate-y-0.5 hover:border-sky-500/30 hover:shadow-lg hover:shadow-sky-500/10",
                      "animate-in fade-in slide-in-from-bottom-3",
                    )}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <div
                      className={cn(
                        "absolute inset-0 bg-gradient-to-br opacity-70 transition group-hover:opacity-100",
                        s.gradient,
                      )}
                    />
                    <div className="relative flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] shadow-sm">
                        <Icon className="h-5 w-5 text-sky-600" />
                      </div>
                      <div>
                        <p className="font-medium">{s.label}</p>
                        <p className="mt-0.5 text-xs text-[var(--muted-foreground)] line-clamp-2">
                          {s.prompt}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((m, i) => (
              <PortalAiMessage key={i} message={m} />
            ))}
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-[var(--border)] bg-[var(--surface)]/95 p-4 backdrop-blur-sm">
        <div
          className={cn(
            "mx-auto max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--background)] p-2 shadow-sm",
            "ring-1 ring-sky-500/10 focus-within:border-sky-500/40 focus-within:ring-sky-500/20",
          )}
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              disabled={streaming}
              placeholder="Ask a question…"
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              className="max-h-32 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-[var(--muted-foreground)]"
            />
            <Button
              size="sm"
              disabled={streaming || !input.trim()}
              onClick={() => void send()}
              className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-0 shadow-md hover:from-sky-700 hover:to-cyan-700"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-center text-[10px] text-[var(--muted-foreground)]">
          Powered by your portal data · Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
