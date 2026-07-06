"use client";

import { useState } from "react";
import {
  Copy,
  Check,
  Pin,
  PinOff,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiMarkdown } from "@/components/ai/ai-markdown";
import { AiWidgetRenderer } from "@/components/ai/ai-widget-renderer";
import type { AiMessage } from "@/types/ai";
import { cn } from "@/lib/utils";

interface AiMessageBubbleProps {
  message: AiMessage;
  onRegenerate?: () => void;
  onFeedback?: (liked: boolean | null) => void;
  onPin?: () => void;
  isLastAssistant?: boolean;
}

export function AiMessageBubble({
  message,
  onRegenerate,
  onFeedback,
  onPin,
  isLastAssistant,
}: AiMessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "group flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl shadow-sm",
          isUser
            ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
            : "bg-gradient-to-br from-violet-600 to-indigo-600 text-white",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          "min-w-0 flex-1",
          isUser ? "max-w-[min(100%,28rem)] text-right" : "max-w-full",
        )}
      >
        <div
          className={cn(
            "rounded-2xl border px-4 py-3 shadow-sm backdrop-blur-sm transition hover:shadow-md",
            isUser
              ? "border-violet-500/20 bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
              : "border-[var(--border)]/80 bg-[var(--surface)]/90",
            isUser && "inline-block text-left",
          )}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed">{message.content}</p>
          ) : (
            <>
              <AiMarkdown content={message.content} />
              {message.streaming && (
                <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-violet-500 align-middle" />
              )}
            </>
          )}
        </div>

        {!isUser && message.widgets && !message.streaming && (
          <AiWidgetRenderer widgets={message.widgets} layout="chat" />
        )}

        {!isUser && !message.streaming && (
          <div className="mt-2 flex flex-wrap items-center gap-1 opacity-60 transition group-hover:opacity-100 sm:opacity-0">
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => void copy()}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 px-2", message.liked === true && "text-emerald-600")}
              onClick={() => onFeedback?.(message.liked === true ? null : true)}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 px-2", message.liked === false && "text-rose-600")}
              onClick={() => onFeedback?.(message.liked === false ? null : false)}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={onPin}>
              {message.pinned ? (
                <PinOff className="h-3.5 w-3.5" />
              ) : (
                <Pin className="h-3.5 w-3.5" />
              )}
            </Button>
            {isLastAssistant && onRegenerate && (
              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={onRegenerate}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
