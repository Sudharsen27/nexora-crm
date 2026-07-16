"use client";

import { useState } from "react";
import { DevelopersNavTabs } from "@/components/developers/developers-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useMarketplace } from "@/hooks/use-developers";
import { installPlugin } from "@/lib/api/developers";

interface DevelopersMarketplacePageProps {
  tenantSlug: string;
}

export function DevelopersMarketplacePage({ tenantSlug }: DevelopersMarketplacePageProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { data, loading, error, refresh } = useMarketplace(tenantSlug, {
    search: search || undefined,
    category,
  });

  async function onInstall(slug: string) {
    setBusy(slug);
    try {
      await installPlugin(tenantSlug, slug);
      setMessage(`Installed ${slug}`);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Install failed");
    } finally {
      setBusy(null);
    }
  }

  if (loading && !data) return <WidgetSkeleton variant="chart" />;
  if (error && !data) {
    return <WidgetError title="Marketplace" message={error} onRetry={() => void refresh()} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plugin Marketplace</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Browse CRM modules, widgets, AI tools, themes, and connectors.
        </p>
      </div>
      <DevelopersNavTabs tenantSlug={tenantSlug} />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder="Search plugins…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          <Button variant={!category ? "default" : "outline"} size="sm" onClick={() => setCategory(undefined)}>
            All
          </Button>
          {(data?.categories ?? []).slice(0, 6).map((cat) => (
            <Button
              key={cat}
              variant={category === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-teal-500/20 bg-teal-500/10 px-4 py-3 text-sm text-teal-800 dark:text-teal-200">
          {message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(data?.items ?? []).map((plugin) => (
          <Card key={plugin.id}>
            <CardHeader>
              <CardTitle className="flex items-start justify-between gap-2 text-base">
                <span>{plugin.name}</span>
                {plugin.is_featured && <Badge>Featured</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-[var(--muted-foreground)] line-clamp-3">{plugin.description}</p>
              <div className="flex flex-wrap gap-1">
                <Badge variant="outline">{plugin.plugin_type}</Badge>
                <Badge variant="secondary">{plugin.category}</Badge>
                <Badge variant="outline">v{plugin.latest_version}</Badge>
                <Badge variant="secondary">★ {plugin.avg_rating.toFixed(1)}</Badge>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">{plugin.install_count} installs</p>
              {plugin.installed ? (
                <Badge variant="default">Installed · {plugin.install_status}</Badge>
              ) : (
                <Button
                  className="w-full bg-teal-600 hover:bg-teal-700"
                  disabled={busy === plugin.slug}
                  onClick={() => void onInstall(plugin.slug)}
                >
                  {busy === plugin.slug ? "Installing…" : "Install"}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
