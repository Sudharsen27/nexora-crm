"use client";

import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EXAMPLES = [
  "Show deals above $50K",
  "Find inactive customers",
  "Summarize this month's revenue",
  "Show meetings with Acme",
  "Search documents for contract",
];

interface AiKnowledgeSearchProps {
  onSearch: (query: string) => void;
}

export function AiKnowledgeSearch({ onSearch }: AiKnowledgeSearchProps) {
  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/20 to-violet-500/20">
          <Search className="h-7 w-7 text-violet-600" />
        </div>
        <h2 className="text-2xl font-bold">Knowledge Search</h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Search your CRM data using natural language
        </p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.elements.namedItem("q") as HTMLInputElement;
          if (input.value.trim()) onSearch(input.value.trim());
        }}
      >
        <Input name="q" placeholder="Ask anything about your CRM data…" className="h-11" />
        <Button type="submit" className="h-11 bg-gradient-to-r from-violet-600 to-indigo-600">
          Search
        </Button>
      </form>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Try these
        </p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => onSearch(ex)}
              className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs transition hover:border-violet-500/40 hover:bg-violet-500/5"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
