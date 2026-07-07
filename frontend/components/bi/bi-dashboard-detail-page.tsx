"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BiNavTabs } from "@/components/bi/bi-nav-tabs";
import { BiWidgetChart } from "@/components/bi/bi-chart-renderer";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { AiMarkdown } from "@/components/ai/ai-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBiDashboard } from "@/lib/api/bi";
import type { BiDashboardDetail } from "@/types/bi";
import { DollarSign } from "lucide-react";

interface BiDashboardDetailPageProps {
  tenantSlug: string;
  dashboardId: string;
}

export function BiDashboardDetailPage({ tenantSlug, dashboardId }: BiDashboardDetailPageProps) {
  const [data, setData] = useState<BiDashboardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        setData(await getBiDashboard(tenantSlug, dashboardId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantSlug, dashboardId]);

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error || !data) return <WidgetError title="Dashboard unavailable" message={error ?? "Dashboard not found"} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Link
            href={`/${tenantSlug}/bi/dashboards`}
            className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboards
          </Link>
          <h1 className="text-2xl font-bold">{data.name}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">{data.description}</p>
        </div>
        <BiNavTabs tenantSlug={tenantSlug} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.widgets
          .filter((w) => w.widget_type === "kpi")
          .map((widget) => {
            const d = widget.data ?? {};
            return (
              <KpiCard
                key={widget.id}
                label={widget.title}
                value={String(d.value ?? "—")}
                icon={DollarSign}
                growthPercent={typeof d.change === "number" ? d.change : null}
                trend={d.trend as { label: string; value: string | number }[] | undefined}
              />
            );
          })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {data.widgets
          .filter((w) => w.widget_type === "ai_summary")
          .map((widget) => (
            <Card key={widget.id} className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">{widget.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <AiMarkdown content={String((widget.data as { summary?: string })?.summary ?? "")} />
              </CardContent>
            </Card>
          ))}

        {data.widgets
          .filter((w) => !["kpi", "ai_summary"].includes(w.widget_type))
          .map((widget) => (
            <BiWidgetChart
              key={widget.id}
              widgetType={widget.widget_type}
              title={widget.title}
              data={widget.data}
            />
          ))}
      </div>
    </div>
  );
}
