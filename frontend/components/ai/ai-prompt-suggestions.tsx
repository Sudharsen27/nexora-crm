"use client";

import {
  AlertTriangle,
  Calendar,
  FileText,
  Mail,
  Sun,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { getPromptSuggestions } from "@/lib/ai/mock-engine";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  alert: AlertTriangle,
  sun: Sun,
  trending: TrendingUp,
  file: FileText,
  calendar: Calendar,
  mail: Mail,
  users: Users,
  trophy: Trophy,
};

interface AiPromptSuggestionsProps {
  onSelect: (prompt: string) => void;
}

export function AiPromptSuggestions({ onSelect }: AiPromptSuggestionsProps) {
  const suggestions = getPromptSuggestions();

  return (
    <div className="mx-auto w-full max-w-3xl px-4">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25">
          <span className="text-2xl">✨</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">How can I help you today?</h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Ask about deals, forecasts, meetings, emails, and customer insights.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {suggestions.map((s, i) => {
          const Icon = ICONS[s.icon] ?? TrendingUp;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(s.prompt)}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-[var(--border)]/80 p-4 text-left transition-all duration-300",
                "hover:-translate-y-0.5 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/10",
                "animate-in fade-in slide-in-from-bottom-3",
              )}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-60 transition group-hover:opacity-100",
                  s.gradient,
                )}
              />
              <div className="relative flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)]/90 shadow-sm">
                  <Icon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="font-medium text-[var(--foreground)]">{s.label}</p>
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
  );
}
