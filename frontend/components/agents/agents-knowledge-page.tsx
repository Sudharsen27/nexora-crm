"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { AgentsNavTabs } from "@/components/agents/agents-nav-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { knowledgeSearch } from "@/lib/api/agents";
import type { KnowledgeSearchResult } from "@/types/agents";

interface AgentsKnowledgePageProps {
  tenantSlug: string;
}

export function AgentsKnowledgePage({ tenantSlug }: AgentsKnowledgePageProps) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<KnowledgeSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    if (!query.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const data = await knowledgeSearch(tenantSlug, query.trim());
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Knowledge Agent</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Search CRM data, meetings, activities, and get AI answers.
        </p>
      </div>
      <AgentsNavTabs tenantSlug={tenantSlug} />
      <Card>
        <CardHeader>
          <CardTitle>Ask the Knowledge Agent</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="e.g. open deals, Acme, pipeline summary…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void search();
            }}
          />
          <Button disabled={busy} onClick={() => void search()}>
            <Search className="mr-2 h-4 w-4" />
            Search
          </Button>
        </CardContent>
      </Card>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <>
          <Card className="border-violet-500/20 bg-violet-500/5">
            <CardHeader>
              <CardTitle className="text-base">Answer</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">{result.answer}</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sources ({result.results.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {result.results.length === 0 ? (
                <p className="text-sm text-[var(--muted-foreground)]">No direct matches — answer uses CRM aggregate context.</p>
              ) : (
                result.results.map((r) => (
                  <div key={`${r.type}-${r.id}`} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{r.title}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{r.subtitle}</p>
                    </div>
                    <Badge variant="outline">{r.type}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
