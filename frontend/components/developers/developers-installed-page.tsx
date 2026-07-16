"use client";

import { useState } from "react";
import { DevelopersNavTabs } from "@/components/developers/developers-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInstalledPlugins } from "@/hooks/use-developers";
import { disablePlugin, enablePlugin, uninstallPlugin, updatePlugin } from "@/lib/api/developers";

interface DevelopersInstalledPageProps {
  tenantSlug: string;
}

export function DevelopersInstalledPage({ tenantSlug }: DevelopersInstalledPageProps) {
  const { data, loading, error, refresh } = useInstalledPlugins(tenantSlug);
  const [busy, setBusy] = useState<string | null>(null);

  async function run(id: string, fn: () => Promise<unknown>) {
    setBusy(id);
    try {
      await fn();
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <WidgetSkeleton variant="list" />;
  if (error) return <WidgetError title="Installed plugins" message={error} onRetry={() => void refresh()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Installed Plugins</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Enable, disable, update, or uninstall plugins.</p>
      </div>
      <DevelopersNavTabs tenantSlug={tenantSlug} />

      <div className="space-y-3">
        {(data ?? []).map((inst) => (
          <Card key={inst.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                <span>{inst.plugin?.name ?? "Plugin"}</span>
                <Badge variant={inst.status === "enabled" ? "default" : "outline"}>{inst.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-[var(--muted-foreground)]">
                v{inst.installed_version}
                {inst.plugin?.latest_version && inst.plugin.latest_version !== inst.installed_version
                  ? ` · latest ${inst.plugin.latest_version}`
                  : ""}
              </p>
              <div className="flex flex-wrap gap-1">
                {(inst.granted_permissions ?? []).map((p) => (
                  <Badge key={p} variant="outline">
                    {p}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {inst.status === "enabled" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy === inst.id}
                    onClick={() => void run(inst.id, () => disablePlugin(tenantSlug, inst.id))}
                  >
                    Disable
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={busy === inst.id}
                    onClick={() => void run(inst.id, () => enablePlugin(tenantSlug, inst.id))}
                  >
                    Enable
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === inst.id}
                  onClick={() => void run(inst.id, () => updatePlugin(tenantSlug, inst.id))}
                >
                  Update
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy === inst.id}
                  onClick={() => void run(inst.id, () => uninstallPlugin(tenantSlug, inst.id))}
                >
                  Uninstall
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(data ?? []).length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)]">No plugins installed yet.</p>
        )}
      </div>
    </div>
  );
}
