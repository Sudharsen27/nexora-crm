"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Star, Sparkles, Code2 } from "lucide-react";
import { IntegrationsNavTabs } from "@/components/integrations/integrations-nav-tabs";
import { WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { installIntegration } from "@/lib/api/integrations";
import { useMarketplace } from "@/hooks/use-integrations";
import { cn } from "@/lib/utils";

interface IntegrationsMarketplacePageProps {
  tenantSlug: string;
}

export function IntegrationsMarketplacePage({ tenantSlug }: IntegrationsMarketplacePageProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [filter, setFilter] = useState<"all" | "popular" | "recommended" | "developer">("all");
  const { data, loading, refresh } = useMarketplace(tenantSlug, {
    search,
    category,
    popular: filter === "popular",
    recommended: filter === "recommended",
    developer: filter === "developer",
  });
  const [busy, setBusy] = useState<string | null>(null);

  async function handleInstall(slug: string) {
    setBusy(slug);
    try {
      const detail = await installIntegration(tenantSlug, slug);
      window.location.href = `/${tenantSlug}/integrations/${detail.id}`;
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">App Marketplace</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Discover and install integrations for your workspace.
          </p>
        </div>
        <IntegrationsNavTabs tenantSlug={tenantSlug} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            className="pl-9"
            placeholder="Search apps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["all", "popular", "recommended", "developer"] as const).map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
            >
              {f === "popular" && <Star className="mr-1 h-3 w-3" />}
              {f === "recommended" && <Sparkles className="mr-1 h-3 w-3" />}
              {f === "developer" && <Code2 className="mr-1 h-3 w-3" />}
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {data && data.categories.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={category === "" ? "default" : "outline"} onClick={() => setCategory("")}>
            All categories
          </Button>
          {data.categories.map((c) => (
            <Button
              key={c}
              size="sm"
              variant={category === c ? "default" : "outline"}
              onClick={() => setCategory(c)}
            >
              {c.replace("_", " ")}
            </Button>
          ))}
        </div>
      ) : null}

      {loading ? <WidgetSkeleton variant="list" /> : null}

      {!loading && data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.apps.map((app) => (
            <Card
              key={app.id}
              className={cn(
                "border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md transition-all hover:shadow-lg",
                app.is_installed && "ring-1 ring-indigo-500/30",
              )}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{app.name}</CardTitle>
                    <CardDescription>{app.vendor}</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    {app.is_popular ? <Badge variant="secondary">Popular</Badge> : null}
                    {app.is_recommended ? <Badge>Recommended</Badge> : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="line-clamp-2 text-sm text-[var(--muted-foreground)]">
                  {app.description ?? "Connect and automate with Nexora CRM."}
                </p>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline">{app.category}</Badge>
                  <Badge variant="outline">{app.auth_type}</Badge>
                </div>
                {app.is_installed ? (
                  <Link
                    href={`/${tenantSlug}/integrations/installed`}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--border)] px-4 text-sm font-medium"
                  >
                    Installed
                  </Link>
                ) : (
                  <Button size="sm" disabled={busy === app.slug} onClick={() => void handleInstall(app.slug)}>
                    {busy === app.slug ? "Installing…" : "Install"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
