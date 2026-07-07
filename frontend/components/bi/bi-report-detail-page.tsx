"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Play } from "lucide-react";
import { BiNavTabs } from "@/components/bi/bi-nav-tabs";
import { BiChartRenderer } from "@/components/bi/bi-chart-renderer";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { exportBiReportCsv, getBiReport, runBiReport } from "@/lib/api/bi";
import type { BiReportDetail, BiReportRunResult } from "@/types/bi";

interface BiReportDetailPageProps {
  tenantSlug: string;
  reportId: string;
}

export function BiReportDetailPage({ tenantSlug, reportId }: BiReportDetailPageProps) {
  const router = useRouter();
  const [report, setReport] = useState<BiReportDetail | null>(null);
  const [result, setResult] = useState<BiReportRunResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const detail = await getBiReport(tenantSlug, reportId);
        setReport(detail);
        const run = await runBiReport(tenantSlug, reportId);
        setResult(run);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load report");
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantSlug, reportId]);

  async function handleRun() {
    setRunning(true);
    try {
      setResult(await runBiReport(tenantSlug, reportId));
    } finally {
      setRunning(false);
    }
  }

  async function handleExport() {
    await exportBiReportCsv(tenantSlug, reportId);
  }

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error || !report) {
    return <WidgetError title="Report unavailable" message={error ?? "Report not found"} />;
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
          <h1 className="text-2xl font-bold">{report.name}</h1>
          <p className="text-sm text-[var(--muted-foreground)]">{report.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BiNavTabs tenantSlug={tenantSlug} />
          <Button variant="outline" onClick={() => void handleRun()} disabled={running}>
            <Play className="mr-2 h-4 w-4" />
            Run
          </Button>
          <Button variant="outline" onClick={() => void handleExport()}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {result ? (
        <BiChartRenderer
          chartType={result.chart_type}
          result={result}
          title={report.name}
          description={`${result.rows.length} rows`}
          tenantSlug={tenantSlug}
        />
      ) : null}

      {result && result.rows.length > 0 ? (
        <Card className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base">Data Table</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)]">
                  {result.columns.map((col) => (
                    <th key={col} className="px-3 py-2 font-medium">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row, i) => (
                  <tr key={i} className="border-b border-[var(--border)]/50">
                    {result.columns.map((col) => (
                      <td key={col} className="px-3 py-2">
                        {String(row[col] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}

      {result && result.drill_down.length > 0 ? (
        <Card className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base">Drill-down — Top Deals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.drill_down.map((deal) => (
              <button
                key={String(deal.id)}
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-[var(--border)]/50 px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]"
                onClick={() => router.push(`/${tenantSlug}/deals/${deal.id}`)}
              >
                <span>{String(deal.title)}</span>
                <span className="text-[var(--muted-foreground)]">
                  {deal.value != null ? `$${Number(deal.value).toLocaleString()}` : "—"}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
