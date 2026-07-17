"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Clock,
  Headphones,
  Star,
  Ticket,
  Timer,
  TrendingUp,
} from "lucide-react";
import { SupportNavTabs } from "@/components/support/support-nav-tabs";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSupportDashboard } from "@/hooks/use-support";
import {
  CHANNEL_LABELS,
  formatDateTime,
  formatMinutes,
  formatTicketNumber,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
} from "@/lib/api/support";
import { cn } from "@/lib/utils";

interface SupportDashboardPageProps {
  tenantSlug: string;
}

export function SupportDashboardPage({ tenantSlug }: SupportDashboardPageProps) {
  const { data, loading, error, refresh } = useSupportDashboard(tenantSlug);

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error || !data) {
    return (
      <WidgetError
        title="Support Dashboard"
        message={error ?? "Failed to load dashboard"}
        onRetry={() => void refresh()}
      />
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <div className="flex items-center gap-2">
          <Headphones className="h-6 w-6 text-violet-500" />
          <h1 className="text-2xl font-bold">Enterprise Support</h1>
        </div>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Service desk overview — tickets, SLA, live chat, and agent performance.
        </p>
      </div>

      <SupportNavTabs tenantSlug={tenantSlug} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Ticket} label="Today" value={String(data.today_tickets)} />
        <KpiCard icon={TrendingUp} label="Open" value={String(data.open_tickets)} href={`/${tenantSlug}/support/tickets?status=open`} />
        <KpiCard icon={Clock} label="Pending" value={String(data.pending_tickets)} tone="warning" />
        <KpiCard icon={Star} label="CSAT" value={data.csat_score.toFixed(1)} tone="success" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Timer} label="Avg Response" value={formatMinutes(data.avg_response_minutes)} />
        <KpiCard icon={Timer} label="Avg Resolution" value={formatMinutes(data.avg_resolution_minutes)} />
        <KpiCard icon={AlertTriangle} label="Overdue" value={String(data.overdue_tickets)} tone="danger" href={`/${tenantSlug}/support/tickets`} />
        <KpiCard icon={AlertTriangle} label="SLA Violations" value={String(data.sla_violations)} tone="danger" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-[var(--border)]/80 bg-[var(--surface)]/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">Agent Performance</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left">
                  <th className="px-4 py-3 font-medium">Agent</th>
                  <th className="px-4 py-3 font-medium">Resolved</th>
                  <th className="px-4 py-3 font-medium">Avg Response</th>
                  <th className="px-4 py-3 font-medium">CSAT</th>
                </tr>
              </thead>
              <tbody>
                {data.agent_performance.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                      No agent data yet
                    </td>
                  </tr>
                ) : (
                  data.agent_performance.map((agent) => (
                    <tr key={agent.user_id} className="border-b border-[var(--border)]/50">
                      <td className="px-4 py-3 font-medium">{agent.full_name}</td>
                      <td className="px-4 py-3">{agent.tickets_resolved}</td>
                      <td className="px-4 py-3">{formatMinutes(agent.avg_response_minutes)}</td>
                      <td className="px-4 py-3">{agent.csat_avg.toFixed(1)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="border-[var(--border)]/80 bg-[var(--surface)]/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">Recent Chats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recent_chats.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No recent chats</p>
            ) : (
              data.recent_chats.map((chat) => (
                <Link
                  key={chat.id}
                  href={`/${tenantSlug}/support/chat?chat=${chat.id}`}
                  className="flex items-center justify-between rounded-lg border border-[var(--border)] p-3 transition hover:bg-[var(--surface-muted)]"
                >
                  <div>
                    <p className="font-medium">{chat.visitor_name ?? chat.assigned_to?.full_name ?? "Visitor"}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {CHANNEL_LABELS[chat.channel] ?? chat.channel} · {chat.message_count} messages
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {chat.status}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-[var(--border)]/80 bg-[var(--surface)]/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Tickets</CardTitle>
          <Link href={`/${tenantSlug}/support/tickets`} className="text-sm text-violet-600 hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                <th className="px-4 py-3 font-medium">Ticket</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {data.recent_tickets.map((ticket) => (
                <tr key={ticket.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--surface-muted)]/50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/${tenantSlug}/support/tickets/${ticket.id}`}
                      className="font-mono text-xs text-violet-600 hover:underline"
                    >
                      {formatTicketNumber(ticket)}
                    </Link>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3">{ticket.subject}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[ticket.status])}>
                      {STATUS_LABELS[ticket.status] ?? ticket.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", PRIORITY_COLORS[ticket.priority])}>
                      {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)]">{formatDateTime(ticket.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
