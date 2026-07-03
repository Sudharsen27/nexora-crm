"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiChatComposer } from "@/components/ai/ai-chat-composer";
import { AiMessageBubble } from "@/components/ai/ai-message-bubble";
import { useAiChat } from "@/hooks/use-ai-chat";
import { cn } from "@/lib/utils";

interface FloatingAiAssistantProps {
  tenantSlug: string;
}

export function FloatingAiAssistant({ tenantSlug }: FloatingAiAssistantProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { activeConversation, sendMessage, isStreaming, createChat, setActiveId } =
    useAiChat(tenantSlug);

  const messages = activeConversation?.messages.slice(-4) ?? [];

  const handleSend = async (text: string) => {
    if (!activeConversation) {
      const id = createChat();
      setActiveId(id);
    }
    await sendMessage(text);
  };

  if (pathname.includes("/ai")) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl",
          "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-500/30",
          "transition hover:scale-105 hover:shadow-2xl hover:shadow-violet-500/40",
          open && "scale-95",
        )}
        aria-label="Open AI assistant"
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </button>

      {open && (
        <div
          className={cn(
            "fixed bottom-24 right-6 z-50 flex w-[min(100vw-2rem,400px)] flex-col overflow-hidden rounded-2xl",
            "border border-[var(--border)] bg-[var(--surface)]/95 shadow-2xl backdrop-blur-xl",
            "animate-in slide-in-from-bottom-4 fade-in duration-300",
          )}
        >
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-600" />
              <span className="text-sm font-semibold">Nexora AI</span>
            </div>
            <Link
              href={`/${tenantSlug}/ai`}
              className="text-xs font-medium text-violet-600 hover:underline"
              onClick={() => setOpen(false)}
            >
              Open workspace
            </Link>
          </div>

          <div className="max-h-80 flex-1 space-y-4 overflow-y-auto p-4 sidebar-scroll">
            {messages.length === 0 ? (
              <div className="py-8 text-center">
                <MessageSquare className="mx-auto h-8 w-8 text-[var(--muted-foreground)]" />
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                  Ask anything about your CRM
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => void handleSend("Generate today's summary")}
                >
                  Try a quick summary
                </Button>
              </div>
            ) : (
              messages.map((m) => <AiMessageBubble key={m.id} message={m} />)
            )}
          </div>

          <AiChatComposer
            onSend={(t) => void handleSend(t)}
            disabled={isStreaming}
            placeholder="Quick question…"
          />
        </div>
      )}
    </>
  );
}
