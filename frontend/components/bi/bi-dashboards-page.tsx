"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, LayoutDashboard, Plus, Trash2 } from "lucide-react";
import { BiNavTabs } from "@/components/bi/bi-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  createBiDashboard,
  deleteBiDashboard,
  duplicateBiDashboard,
} from "@/lib/api/bi";
import { useBiDashboards } from "@/hooks/use-bi";
import { cn } from "@/lib/utils";

interface BiDashboardsPageProps {
  tenantSlug: string;
}

export function BiDashboardsPage({ tenantSlug }: BiDashboardsPageProps) {
  const { data, loading, error, refresh } = useBiDashboards(tenantSlug);
  const [busy, setBusy] = useState<string | null>(null);

  async function handleCreate() {
    setBusy("create");
    try {
      const dash = await createBiDashboard(tenantSlug, {
        name: "New Dashboard",
        description: "Custom analytics dashboard",
        visibility: "private",
        widgets: [],
      });
      window.location.href = `/${tenantSlug}/bi/dashboards/${dash.id}`;
    } finally {
      setBusy(null);
    }
  }

  async function handleDuplicate(id: string) {
    setBusy(id);
    try {
      await duplicateBiDashboard(tenantSlug, id);
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this dashboard?")) return;
    setBusy(id);
    try {
      await deleteBiDashboard(tenantSlug, id);
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Custom Dashboards</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Build, share, and duplicate executive views.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <BiNavTabs tenantSlug={tenantSlug} />
          <Button onClick={handleCreate} disabled={busy === "create"}>
            <Plus className="mr-2 h-4 w-4" />
            New Dashboard
          </Button>
        </div>
      </div>

      {loading ? <WidgetSkeleton variant="list" /> : null}
      {error ? <WidgetError title="Failed to load" message={error} /> : null}

      {!loading && !error ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((dash) => (
            <Card
              key={dash.id}
              className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md transition-all hover:shadow-lg"
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">
                      <Link
                        href={`/${tenantSlug}/bi/dashboards/${dash.id}`}
                        className="hover:text-violet-600"
                      >
                        {dash.name}
                      </Link>
                    </CardTitle>
                    <CardDescription>{dash.description ?? "No description"}</CardDescription>
                  </div>
                  <LayoutDashboard className="h-5 w-5 text-violet-500" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{dash.widget_count} widgets</Badge>
                  <Badge variant="outline">{dash.visibility}</Badge>
                  {dash.is_executive ? <Badge>Executive</Badge> : null}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/${tenantSlug}/bi/dashboards/${dash.id}`}
                    className={cn(
                      "inline-flex h-8 items-center justify-center rounded-lg border border-[var(--border)] px-3 text-xs font-medium",
                    )}
                  >
                    Open
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleDuplicate(dash.id)}
                    disabled={busy === dash.id}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  {!dash.is_executive ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleDelete(dash.id)}
                      disabled={busy === dash.id}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
