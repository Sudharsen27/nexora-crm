"use client";

import Link from "next/link";
import { Code2, Puzzle, Terminal, Webhook, Zap } from "lucide-react";
import { DevelopersNavTabs } from "@/components/developers/developers-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDeveloperDashboard } from "@/hooks/use-developers";

interface DevelopersOverviewPageProps {
  tenantSlug: string;
}

export function DevelopersOverviewPage({ tenantSlug }: DevelopersOverviewPageProps) {
  const { data, loading, error, refresh } = useDeveloperDashboard(tenantSlug);

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error || !data) {
    return <WidgetError title="Developer Platform" message={error ?? "Failed"} onRetry={() => void refresh()} />;
  }

  const kpis = [
    { label: "Installed", value: data.installed_plugins, icon: Puzzle },
    { label: "Enabled", value: data.enabled_plugins, icon: Zap },
    { label: "Marketplace", value: data.marketplace_plugins, icon: Code2 },
    { label: "Webhooks", value: data.webhook_count, icon: Webhook },
    { label: "API calls (24h)", value: data.api_calls_24h, icon: Terminal },
    { label: "Webhook fails", value: data.webhook_failures_24h, icon: Webhook },
  ];

  return (
    <div className="space-y-6 pb-8">
      <div>
        <div className="flex items-center gap-2">
          <Code2 className="h-6 w-6 text-teal-600" />
          <h1 className="text-2xl font-bold">Developer Platform</h1>
        </div>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Plugin marketplace, SDK, REST & GraphQL explorers, webhooks, and CLI — AppExchange for Nexora.
        </p>
      </div>

      <DevelopersNavTabs tenantSlug={tenantSlug} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur">
            <CardContent className="flex items-center gap-3 p-4">
              <kpi.icon className="h-5 w-5 text-teal-600" />
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">{kpi.label}</p>
                <p className="text-xl font-semibold">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Featured plugins</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.featured.map((plugin) => (
              <div key={plugin.id} className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] p-3">
                <div>
                  <p className="font-medium">{plugin.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)] line-clamp-2">{plugin.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge variant="outline">{plugin.plugin_type}</Badge>
                    <Badge variant="secondary">★ {plugin.avg_rating.toFixed(1)}</Badge>
                  </div>
                </div>
                <Link
                  href={`/${tenantSlug}/developers/marketplace`}
                  className="shrink-0 text-sm font-medium text-teal-600 hover:underline"
                >
                  Browse
                </Link>
              </div>
            ))}
            {data.featured.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)]">No featured plugins yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent installs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recent_installs.map((inst) => (
              <div key={inst.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3">
                <div>
                  <p className="font-medium">{inst.plugin?.name ?? "Plugin"}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    v{inst.installed_version} · {inst.status}
                  </p>
                </div>
                <Badge variant={inst.status === "enabled" ? "default" : "outline"}>{inst.status}</Badge>
              </div>
            ))}
            {data.recent_installs.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)]">
                Install from the{" "}
                <Link href={`/${tenantSlug}/developers/marketplace`} className="text-teal-600 hover:underline">
                  Marketplace
                </Link>
                .
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CLI quick reference</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.cli_commands.slice(0, 5).map((cmd) => (
              <div key={cmd.command} className="rounded-lg bg-[var(--surface-muted)] p-3 font-mono text-xs">
                <p className="text-teal-700 dark:text-teal-300">{cmd.command}</p>
                <p className="mt-1 font-sans text-[var(--muted-foreground)]">{cmd.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Webhook activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recent_webhook_logs.map((log) => (
              <div key={log.id} className="flex items-center justify-between text-sm">
                <span className="truncate">{log.event_type}</span>
                <Badge variant={log.status === "success" ? "default" : "destructive"}>{log.status}</Badge>
              </div>
            ))}
            {data.recent_webhook_logs.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)]">No webhook deliveries yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
