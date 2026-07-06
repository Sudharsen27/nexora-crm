"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  FileText,
  Handshake,
  HelpCircle,
  Receipt,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalPageError, PortalPageLoading } from "@/components/portal/portal-page-state";
import { getPortalDashboard } from "@/lib/api/portal";
import type { PortalDashboard } from "@/types/portal";

interface PortalDashboardPageProps {
  tenantSlug: string;
}

export function PortalDashboardPage({ tenantSlug }: PortalDashboardPageProps) {
  const [data, setData] = useState<PortalDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getPortalDashboard(tenantSlug)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [tenantSlug]);

  if (error) return <PortalPageError message={error} />;
  if (!data) return <PortalPageLoading label="Loading your dashboard…" />;

  const base = `/portal/${tenantSlug}`;

  const quickLinks = [
    { href: `${base}/notifications`, label: "Notifications", count: data.unread_notifications },
    { href: `${base}/support`, label: "Open tickets", count: data.open_tickets },
    { href: `${base}/invoices`, label: "Outstanding", count: data.outstanding_payments },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Track deals, documents, meetings, and support in one place.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((kpi) => (
          <Card key={kpi.key} className="border-[var(--border)] bg-[var(--surface)]">
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                {kpi.label}
              </p>
              <p className="mt-2 text-2xl font-bold">{kpi.value}</p>
              {kpi.hint && (
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">{kpi.hint}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium hover:bg-[var(--surface-muted)]"
          >
            {link.label}
            {link.count > 0 && (
              <span className="rounded-full bg-sky-600 px-1.5 py-0.5 text-[10px] text-white">
                {link.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {data.announcements.length > 0 && (
        <Card className="border-sky-500/20 bg-sky-500/5">
          <CardHeader>
            <CardTitle className="text-base">Announcements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.announcements.map((a) => (
              <div key={a.id}>
                <p className="font-medium">{a.title}</p>
                <p className="text-sm text-[var(--muted-foreground)]">{a.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Handshake className="h-4 w-4 text-sky-600" />
              Open deals
            </CardTitle>
            <Link href={`${base}/deals`} className="text-xs text-sky-600 hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.open_deals.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No open deals linked to your account.</p>
            ) : (
              data.open_deals.map((deal) => (
                <Link
                  key={deal.id}
                  href={`${base}/deals/${deal.id}`}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2.5 transition hover:bg-[var(--surface-muted)]"
                >
                  <div>
                    <p className="text-sm font-medium">{deal.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{deal.stage_label}</p>
                  </div>
                  <Badge variant="secondary">{deal.probability}%</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4 text-sky-600" />
              Upcoming meetings
            </CardTitle>
            <Link href={`${base}/calendar`} className="text-xs text-sky-600 hover:underline">
              Calendar
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.upcoming_meetings.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No upcoming meetings.</p>
            ) : (
              data.upcoming_meetings.map((m) => (
                <div key={m.id} className="rounded-xl border border-[var(--border)] px-3 py-2.5">
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {new Date(m.start_datetime).toLocaleString()}
                  </p>
                  {m.meeting_url && (
                    <a
                      href={m.meeting_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs text-sky-600 hover:underline"
                    >
                      Join meeting
                    </a>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4 text-sky-600" />
              Recent documents
            </CardTitle>
            <Link href={`${base}/documents`} className="text-xs text-sky-600 hover:underline">
              Document center
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.recent_documents.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No documents yet.</p>
            ) : (
              data.recent_documents.map((doc) => (
                <Link
                  key={doc.id}
                  href={`${base}/documents/${doc.id}`}
                  className="flex items-center justify-between text-sm hover:text-sky-600"
                >
                  <span className="truncate font-medium">{doc.name}</span>
                  <Badge variant="outline">{doc.status}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-sky-600" />
              Recent activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recent_activities.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No recent activity.</p>
            ) : (
              data.recent_activities.map((item) => (
                <div key={item.id} className="border-l-2 border-sky-500/30 pl-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {new Date(item.occurred_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`${base}/support`}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium hover:bg-[var(--surface-muted)]"
        >
          <HelpCircle className="h-4 w-4" />
          Open support ticket
        </Link>
        <Link
          href={`${base}/invoices`}
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium hover:bg-[var(--surface-muted)]"
        >
          <Receipt className="h-4 w-4" />
          View invoices
        </Link>
        <Link
          href={`${base}/ai`}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-4 py-3 text-sm font-medium text-white"
        >
          <Sparkles className="h-4 w-4" />
          Ask AI Assistant
        </Link>
      </div>
    </div>
  );
}
