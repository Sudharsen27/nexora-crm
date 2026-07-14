"use client";

import { AgentsNavTabs } from "@/components/agents/agents-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgentMemory } from "@/hooks/use-agents";

interface AgentsMemoryPageProps {
  tenantSlug: string;
}

export function AgentsMemoryPage({ tenantSlug }: AgentsMemoryPageProps) {
  const { data, loading, error, refresh } = useAgentMemory(tenantSlug);

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error) return <WidgetError title="Memory" message={error} onRetry={() => void refresh()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agent Memory</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Business context and recent agent actions.</p>
      </div>
      <AgentsNavTabs tenantSlug={tenantSlug} />
      <Card>
        <CardHeader>
          <CardTitle>Stored memories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data ?? []).length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">Memory is empty — run agents to build context.</p>
          ) : (
            data!.map((m) => (
              <div key={m.id} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{m.memory_type}</Badge>
                  <code className="text-xs">{m.memory_key}</code>
                </div>
                <p className="mt-1 text-[var(--muted-foreground)]">
                  {String((m.content as { summary?: string }).summary ?? JSON.stringify(m.content).slice(0, 160))}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
