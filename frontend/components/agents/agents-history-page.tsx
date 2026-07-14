"use client";

import { AgentsNavTabs } from "@/components/agents/agents-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgentExecutions } from "@/hooks/use-agents";

interface AgentsHistoryPageProps {
  tenantSlug: string;
}

export function AgentsHistoryPage({ tenantSlug }: AgentsHistoryPageProps) {
  const { data, loading, error, refresh } = useAgentExecutions(tenantSlug);

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error) return <WidgetError title="History" message={error} onRetry={() => void refresh()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Execution History</h1>
      </div>
      <AgentsNavTabs tenantSlug={tenantSlug} />
      <Card>
        <CardHeader>
          <CardTitle>Recent agent runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data ?? []).length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No history yet.</p>
          ) : (
            data!.map((ex) => (
              <div key={ex.id} className="rounded-lg border border-[var(--border)] px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    {ex.agent_name ?? "Agent"} · {ex.action.replace(/_/g, " ")}
                  </p>
                  <Badge variant="outline">{ex.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                  {String(ex.output_payload.summary ?? ex.error_message ?? "—")}
                </p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {new Date(ex.created_at).toLocaleString()} · {ex.duration_ms}ms · {ex.tokens_used} tokens
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
