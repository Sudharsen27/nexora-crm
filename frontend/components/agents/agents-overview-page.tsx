"use client";

import { useState } from "react";
import {
  Bot,
  CheckCircle2,
  Clock,
  Lightbulb,
  Sparkles,
  Zap,
} from "lucide-react";
import { AgentsNavTabs } from "@/components/agents/agents-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgentsDashboard } from "@/hooks/use-agents";
import { executeAgent, orchestrateAgents } from "@/lib/api/agents";
import { cn } from "@/lib/utils";

interface AgentsOverviewPageProps {
  tenantSlug: string;
}

export function AgentsOverviewPage({ tenantSlug }: AgentsOverviewPageProps) {
  const { data, loading, error, refresh } = useAgentsDashboard(tenantSlug);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runOrchestration() {
    setBusy(true);
    try {
      const results = await orchestrateAgents(tenantSlug, {
        trigger: "manual",
        agent_slugs: ["sales", "marketing", "workflow", "executive"],
      });
      setMessage(`Orchestration completed — ${results.length} agents ran`);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Orchestration failed");
    } finally {
      setBusy(false);
    }
  }

  async function runAgent(agentId: string, action: string) {
    setBusy(true);
    try {
      await executeAgent(tenantSlug, agentId, action);
      setMessage("Agent execution completed");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error || !data) {
    return <WidgetError title="AI Agents" message={error ?? "Failed"} onRetry={() => void refresh()} />;
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-violet-500" />
            <h1 className="text-2xl font-bold">AI Operations Center</h1>
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Multi-agent CRM intelligence — Sales, Support, Marketing, Executive, and more.
          </p>
        </div>
        <Button
          onClick={() => void runOrchestration()}
          disabled={busy}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
        >
          <Zap className="mr-2 h-4 w-4" />
          Run Agent Pipeline
        </Button>
      </div>

      <AgentsNavTabs tenantSlug={tenantSlug} />

      {message && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-700 dark:text-violet-300">
          {message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Bot} label="Agents" value={`${data.enabled_agents}/${data.total_agents}`} />
        <KpiCard icon={Clock} label="Executions (24h)" value={String(data.executions_24h)} />
        <KpiCard icon={CheckCircle2} label="Success Rate" value={`${data.success_rate}%`} />
        <KpiCard icon={Lightbulb} label="Recommendations" value={String(data.pending_recommendations)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 border-violet-500/10 bg-gradient-to-br from-violet-500/5 to-transparent">
          <CardHeader>
            <CardTitle className="text-base">Agent Status</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {data.agents.map((agent) => (
              <div
                key={agent.id}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{agent.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-[var(--muted-foreground)]">
                      {agent.description}
                    </p>
                  </div>
                  <Badge variant={agent.is_enabled ? "default" : "outline"} className="capitalize">
                    {agent.status}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                  <span>{agent.total_executions} runs · {agent.total_tokens} tokens</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7"
                    disabled={busy || !agent.is_enabled}
                    onClick={() => void runAgent(agent.id, agent.capabilities[0] ?? "run")}
                  >
                    Run
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Live Metrics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <MetricRow label="Tokens (24h)" value={data.tokens_24h.toLocaleString()} />
            <MetricRow label="Running now" value={String(data.running_agents)} />
            <MetricRow label="Open insights" value={String(data.open_insights)} />
            <MetricRow label="Queued tasks" value={String(data.queued_tasks)} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Executions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recent_executions.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No executions yet — run an agent.</p>
            ) : (
              data.recent_executions.slice(0, 6).map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{ex.agent_name ?? "Agent"} · {ex.action}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {ex.duration_ms}ms · {ex.tokens_used} tokens
                    </p>
                  </div>
                  <Badge
                    variant={ex.status === "completed" ? "default" : "outline"}
                    className={cn(ex.status === "failed" && "border-red-500 text-red-600")}
                  >
                    {ex.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recommendations.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">Run agents to generate recommendations.</p>
            ) : (
              data.recommendations.slice(0, 5).map((rec) => (
                <div key={rec.id} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                  <p className="font-medium">{rec.title}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{rec.description}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)]">
          <Icon className="h-4 w-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-[var(--surface-muted)] px-3 py-2">
      <span className="text-[var(--muted-foreground)]">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
