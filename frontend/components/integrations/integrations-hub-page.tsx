"use client";

import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  Key,
  Plug,
  Webhook,
  AlertTriangle,
} from "lucide-react";
import { IntegrationsNavTabs } from "@/components/integrations/integrations-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useIntegrationDashboard } from "@/hooks/use-integrations";
import { cn } from "@/lib/utils";

const HEALTH_COLORS: Record<string, string> = {
  healthy: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  degraded: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  unhealthy: "bg-red-500/15 text-red-700 dark:text-red-300",
  unknown: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
};

interface IntegrationsHubPageProps {
  tenantSlug: string;
}

export function IntegrationsHubPage({ tenantSlug }: IntegrationsHubPageProps) {
  const { data, loading, error } = useIntegrationDashboard(tenantSlug);

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error || !data) {
    return <WidgetError title="Integrations unavailable" message={error ?? "Failed to load"} />;
  }

  const stats = [
    { label: "Installed", value: data.installed_count, icon: Plug },
    { label: "Connected", value: data.connected_count, icon: CheckCircle2 },
    { label: "Healthy", value: data.healthy_count, icon: Activity },
    { label: "Errors", value: data.error_count, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Integrations Hub
          </p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Enterprise Integrations</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Connect apps, automate workflows, and manage API access.
          </p>
        </div>
        <IntegrationsNavTabs tenantSlug={tenantSlug} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md">
              <CardContent className="flex items-center gap-4 p-5">
                <span className="rounded-xl bg-indigo-500/10 p-3 text-indigo-600 dark:text-indigo-400">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Webhook className="h-4 w-4" />
              Webhook Activity
            </CardTitle>
            <CardDescription>{data.webhook_count} webhooks configured</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recent_webhook_logs.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No webhook deliveries yet</p>
            ) : (
              data.recent_webhook_logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg border border-[var(--border)]/50 px-3 py-2 text-sm">
                  <span>{log.event_type}</span>
                  <Badge variant={log.status === "success" ? "secondary" : "destructive"}>{log.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Key className="h-4 w-4" />
              API Usage
            </CardTitle>
            <CardDescription>{data.api_key_count} active keys · {data.total_api_calls} total calls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recent_syncs.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No sync history yet</p>
            ) : (
              data.recent_syncs.map((sync) => (
                <div key={sync.id} className="flex items-center justify-between rounded-lg border border-[var(--border)]/50 px-3 py-2 text-sm">
                  <span>{sync.sync_mode} sync</span>
                  <span className="text-[var(--muted-foreground)]">{sync.records_processed} records</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Installed Apps</CardTitle>
          <Link href={`/${tenantSlug}/integrations/marketplace`} className="text-xs text-indigo-600 hover:underline">
            Browse marketplace
          </Link>
        </CardHeader>
        <CardContent>
          {data.installed_apps.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No integrations installed yet.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.installed_apps.map((app) => (
                <Link
                  key={app.id}
                  href={`/${tenantSlug}/integrations/${app.id}`}
                  className="rounded-xl border border-[var(--border)]/60 p-4 transition-colors hover:bg-[var(--surface-muted)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{app.app_name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{app.app_category}</p>
                    </div>
                    <Badge className={cn("shrink-0", HEALTH_COLORS[app.health] ?? HEALTH_COLORS.unknown)}>
                      {app.health}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs capitalize text-[var(--muted-foreground)]">{app.status}</p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
