"use client";

import { useState } from "react";
import Link from "next/link";
import { FileBarChart, Plus, Star, Trash2 } from "lucide-react";
import { BiNavTabs } from "@/components/bi/bi-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { deleteBiReport } from "@/lib/api/bi";
import { useBiReports } from "@/hooks/use-bi";

interface BiReportsPageProps {
  tenantSlug: string;
}

export function BiReportsPage({ tenantSlug }: BiReportsPageProps) {
  const { data, loading, error, refresh } = useBiReports(tenantSlug);
  const [busy, setBusy] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this report?")) return;
    setBusy(id);
    try {
      await deleteBiReport(tenantSlug, id);
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Interactive reports with charts, filters, and drill-down.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <BiNavTabs tenantSlug={tenantSlug} />
          <Link
            href={`/${tenantSlug}/bi/reports/new`}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Report
          </Link>
        </div>
      </div>

      {loading ? <WidgetSkeleton variant="list" /> : null}
      {error ? <WidgetError title="Failed to load" message={error} /> : null}

      {!loading && !error ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.length === 0 ? (
            <Card className="md:col-span-2 xl:col-span-3">
              <CardContent className="py-12 text-center text-[var(--muted-foreground)]">
                No reports yet. Create one from a template or start from scratch.
              </CardContent>
            </Card>
          ) : (
            data.map((report) => (
              <Card
                key={report.id}
                className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        <Link
                          href={`/${tenantSlug}/bi/reports/${report.id}`}
                          className="hover:text-violet-600"
                        >
                          {report.name}
                        </Link>
                      </CardTitle>
                      <CardDescription>{report.description ?? "No description"}</CardDescription>
                    </div>
                    {report.is_favorite ? <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Badge variant="secondary">{report.chart_type}</Badge>
                    <FileBarChart className="h-4 w-4 text-violet-500" />
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/${tenantSlug}/bi/reports/${report.id}`}
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--border)] px-3 text-xs font-medium"
                    >
                      Open
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void handleDelete(report.id)}
                      disabled={busy === report.id}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
