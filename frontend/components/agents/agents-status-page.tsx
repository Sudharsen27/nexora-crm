"use client";

import { useState } from "react";
import { AgentsNavTabs } from "@/components/agents/agents-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgents } from "@/hooks/use-agents";
import { executeAgent, toggleAgent } from "@/lib/api/agents";

interface AgentsStatusPageProps {
  tenantSlug: string;
}

export function AgentsStatusPage({ tenantSlug }: AgentsStatusPageProps) {
  const { data, loading, error, refresh } = useAgents(tenantSlug);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error) return <WidgetError title="Agents" message={error} onRetry={() => void refresh()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agent Fleet</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Enable, disable, and execute specialized CRM agents.</p>
      </div>
      <AgentsNavTabs tenantSlug={tenantSlug} />
      <div className="grid gap-4 lg:grid-cols-2">
        {(data ?? []).map((agent) => (
          <Card key={agent.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{agent.name}</span>
                <Badge variant={agent.is_enabled ? "default" : "outline"}>{agent.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-[var(--muted-foreground)]">{agent.description}</p>
              <div className="flex flex-wrap gap-1">
                {agent.capabilities.slice(0, 6).map((c) => (
                  <Badge key={c} variant="outline" className="text-[10px]">
                    {c.replace(/_/g, " ")}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)]">
                <span>{agent.total_executions} executions</span>
                <span>·</span>
                <span>{agent.success_count} success</span>
                <span>·</span>
                <span>{agent.total_tokens} tokens</span>
                <span>·</span>
                <span>avg {Math.round(agent.avg_duration_ms)}ms</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={busyId === agent.id || !agent.is_enabled}
                  onClick={() => {
                    setBusyId(agent.id);
                    void executeAgent(tenantSlug, agent.id, agent.capabilities[0] ?? "run")
                      .then(() => refresh())
                      .finally(() => setBusyId(null));
                  }}
                >
                  Execute
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyId === agent.id}
                  onClick={() => {
                    setBusyId(agent.id);
                    void toggleAgent(tenantSlug, agent.id, !agent.is_enabled)
                      .then(() => refresh())
                      .finally(() => setBusyId(null));
                  }}
                >
                  {agent.is_enabled ? "Disable" : "Enable"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
