"use client";

import { useRef, useState } from "react";
import { ArrowUp, Paperclip, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AiChatComposerProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function AiChatComposer({
  onSend,
  disabled,
  placeholder = "Ask Nexora AI anything about your CRM…",
}: AiChatComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  return (
    <div className="border-t border-[var(--border)]/80 bg-[var(--surface)]/80 p-4 backdrop-blur-xl">
      <div className="mx-auto max-w-3xl">
        <div
          className={cn(
            "relative rounded-2xl border border-[var(--border)] bg-[var(--background)]/80 p-2 shadow-lg",
            "ring-1 ring-violet-500/10 focus-within:border-violet-500/40 focus-within:ring-violet-500/20",
          )}
        >
          <div className="flex items-end gap-2">
            <Button variant="ghost" size="sm" className="h-9 w-9 shrink-0 px-0" disabled>
              <Paperclip className="h-4 w-4 text-[var(--muted-foreground)]" />
            </Button>
            <textarea
              ref={textareaRef}
              rows={1}
              value={value}
              disabled={disabled}
              placeholder={placeholder}
              onChange={(e) => {
                setValue(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              className="max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-[var(--muted-foreground)]"
            />
            <Button
              size="sm"
              disabled={disabled || !value.trim()}
              onClick={submit}
              className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-0 shadow-md hover:opacity-95"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[10px] text-[var(--muted-foreground)]">
          <Sparkles className="h-3 w-3" />
          Nexora AI can analyze deals, forecast revenue, and draft communications. Preview mode.
        </p>
      </div>
    </div>
  );
}
