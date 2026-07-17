"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { SupportNavTabs } from "@/components/support/support-nav-tabs";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSupportAnalytics } from "@/hooks/use-support";
import { formatMinutes } from "@/lib/api/support";

interface AnalyticsPageProps {
  tenantSlug: string;
}

export function AnalyticsPage({ tenantSlug }: AnalyticsPageProps) {
  const [days, setDays] = useState(30);
  const { data, loading, error, refresh } = useSupportAnalytics(tenantSlug, days);

  if (loading && !data) return <WidgetSkeleton variant="chart" />;
  if (error || !data) {
    return (
      <WidgetError
        title="Support Analytics"
        message={error ?? "Failed to load analytics"}
        onRetry={() => void refresh()}
      />
    );
  }

  const slaChartData = data.sla_performance.map((item) => ({
    priority: item.priority,
    met: item.met,
    breached: item.breached,
    compliance: Math.round(item.compliance_rate * 100),
  }));

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-violet-500" />
            <h1 className="text-2xl font-bold">Support Analytics</h1>
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Volume, resolution, SLA, and CSAT trends</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <Button key={d} variant={days === d ? "default" : "outline"} size="sm" onClick={() => setDays(d)}>
              {d}d
            </Button>
          ))}
        </div>
      </div>

      <SupportNavTabs tenantSlug={tenantSlug} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Resolution Rate"
          value={`${Math.round(data.resolution_rate * 100)}%`}
          icon={BarChart3}
          tone="success"
        />
        <KpiCard
          label="Total Volume"
          value={String(data.volume_by_day.reduce((s, d) => s + d.count, 0))}
          icon={BarChart3}
        />
        <KpiCard
          label="Avg CSAT"
          value={
            data.csat_trend.length
              ? (data.csat_trend.reduce((s, d) => s + d.score, 0) / data.csat_trend.length).toFixed(1)
              : "—"
          }
          icon={BarChart3}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-[var(--border)]/80 bg-[var(--surface)]/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">Ticket Volume</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.volume_by_day}>
                <defs>
                  <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#7c3aed" fill="url(#volumeGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-[var(--border)]/80 bg-[var(--surface)]/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">CSAT Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.csat_trend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="score" stroke="#10b981" fill="#10b98133" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-[var(--border)]/80 bg-[var(--surface)]/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">SLA Performance by Priority</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={slaChartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="priority" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="met" fill="#10b981" name="Met" stackId="sla" />
                <Bar dataKey="breached" fill="#ef4444" name="Breached" stackId="sla" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-[var(--border)]/80 bg-[var(--surface)]/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">Agent Leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left">
                  <th className="px-4 py-3 font-medium">Agent</th>
                  <th className="px-4 py-3 font-medium">Resolved</th>
                  <th className="px-4 py-3 font-medium">Avg Resolution</th>
                  <th className="px-4 py-3 font-medium">CSAT</th>
                </tr>
              </thead>
              <tbody>
                {data.agent_leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                      No data
                    </td>
                  </tr>
                ) : (
                  data.agent_leaderboard.map((agent) => (
                    <tr key={agent.user_id} className="border-b border-[var(--border)]/50">
                      <td className="px-4 py-3 font-medium">{agent.full_name}</td>
                      <td className="px-4 py-3">{agent.tickets_resolved}</td>
                      <td className="px-4 py-3">{formatMinutes(agent.avg_resolution_minutes)}</td>
                      <td className="px-4 py-3">{agent.csat_avg.toFixed(1)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
