"use client";

import Link from "next/link";
import { IntegrationsNavTabs } from "@/components/integrations/integrations-nav-tabs";
import { WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useInstalledIntegrations } from "@/hooks/use-integrations";
import { cn } from "@/lib/utils";

const HEALTH_COLORS: Record<string, string> = {
  healthy: "bg-emerald-500/15 text-emerald-700",
  unhealthy: "bg-red-500/15 text-red-700",
  unknown: "bg-zinc-500/15 text-zinc-600",
};

interface IntegrationsInstalledPageProps {
  tenantSlug: string;
}

export function IntegrationsInstalledPage({ tenantSlug }: IntegrationsInstalledPageProps) {
  const { data, loading } = useInstalledIntegrations(tenantSlug);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Installed Apps</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Manage connected integrations.</p>
        </div>
        <IntegrationsNavTabs tenantSlug={tenantSlug} />
      </div>

      {loading ? <WidgetSkeleton variant="list" /> : null}

      {!loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.length === 0 ? (
            <Card className="md:col-span-2 xl:col-span-3">
              <CardContent className="py-12 text-center text-[var(--muted-foreground)]">
                No apps installed.{" "}
                <Link href={`/${tenantSlug}/integrations/marketplace`} className="text-indigo-600 hover:underline">
                  Browse marketplace
                </Link>
              </CardContent>
            </Card>
          ) : (
            data.map((app) => (
              <Link key={app.id} href={`/${tenantSlug}/integrations/${app.id}`}>
                <Card className="h-full border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md transition-all hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{app.app_name}</CardTitle>
                      <Badge className={cn(HEALTH_COLORS[app.health] ?? HEALTH_COLORS.unknown)}>
                        {app.health}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm capitalize text-[var(--muted-foreground)]">{app.status}</p>
                    {app.last_sync_at ? (
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        Last sync: {new Date(app.last_sync_at).toLocaleString()}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
