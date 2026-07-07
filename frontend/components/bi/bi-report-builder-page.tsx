"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BiNavTabs } from "@/components/bi/bi-nav-tabs";
import { WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createBiReport, listBiTemplates } from "@/lib/api/bi";
import type { BiTemplateSummary } from "@/types/bi";

const CHART_TYPES = ["bar", "horizontal_bar", "line", "area", "pie", "donut", "funnel", "table"];
const METRICS = [
  { key: "deals_by_stage", label: "Pipeline by Stage" },
  { key: "revenue_trend", label: "Revenue Trend" },
  { key: "leads_by_source", label: "Lead Sources" },
  { key: "team_performance", label: "Team Performance" },
];

interface BiReportBuilderPageProps {
  tenantSlug: string;
}

export function BiReportBuilderPage({ tenantSlug }: BiReportBuilderPageProps) {
  const router = useRouter();
  const [templates, setTemplates] = useState<BiTemplateSummary[]>([]);
  const [name, setName] = useState("New Report");
  const [chartType, setChartType] = useState("bar");
  const [metricKey, setMetricKey] = useState("deals_by_stage");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void listBiTemplates(tenantSlug).then(setTemplates);
  }, [tenantSlug]);

  function applyTemplate(template: BiTemplateSummary) {
    setName(template.name);
    const cfg = template.config ?? {};
    if (cfg.chart_type) setChartType(String(cfg.chart_type));
    if (cfg.metric_key) setMetricKey(String(cfg.metric_key));
  }

  async function handleCreate() {
    setSaving(true);
    try {
      const report = await createBiReport(tenantSlug, {
        name,
        chart_type: chartType,
        config: {
          metric_key: metricKey,
          date_range: "last_30_days",
          drill_down_entity: "deals",
        },
      });
      router.push(`/${tenantSlug}/bi/reports/${report.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Link
            href={`/${tenantSlug}/bi/reports`}
            className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Reports
          </Link>
          <h1 className="text-2xl font-bold">Report Builder</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Choose metrics, chart type, and filters.
          </p>
        </div>
        <BiNavTabs tenantSlug={tenantSlug} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
            <CardDescription>Define columns, metrics, and visualization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report-name">Report name</Label>
              <Input id="report-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="metric-key">Metric</Label>
                <Select
                  id="metric-key"
                  value={metricKey}
                  onChange={(e) => setMetricKey(e.target.value)}
                >
                  {METRICS.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="chart-type">Chart type</Label>
                <Select
                  id="chart-type"
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value)}
                >
                  {CHART_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.replace("_", " ")}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <Button onClick={() => void handleCreate()} disabled={saving || !name.trim()}>
              {saving ? "Creating…" : "Create Report"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base">Templates</CardTitle>
            <CardDescription>Start from a pre-built report</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {templates.length === 0 ? (
              <WidgetSkeleton variant="list" />
            ) : (
              templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="w-full rounded-lg border border-[var(--border)]/50 px-3 py-2 text-left text-sm transition-colors hover:bg-[var(--surface-muted)]"
                >
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{t.description}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
