"use client";

import { ShieldAlert, Ban, Monitor } from "lucide-react";
import { AdminNavTabs } from "@/components/admin/admin-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSecurityOverview } from "@/hooks/use-admin";

interface AdminSecurityPageProps {
  tenantSlug: string;
}

export function AdminSecurityPage({ tenantSlug }: AdminSecurityPageProps) {
  const { data, loading, error, refresh } = useSecurityOverview(tenantSlug);

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error || !data) return <WidgetError title="Security" message={error ?? "Failed"} onRetry={() => void refresh()} />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Security Center</h1></div>
      <AdminNavTabs tenantSlug={tenantSlug} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Security Score</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold text-indigo-600">{data.security_score}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Failed Logins</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{data.failed_logins_24h}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Suspicious</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{data.suspicious_logins}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">MFA Users</CardTitle></CardHeader>
          <CardContent className="text-3xl font-bold">{data.mfa_enabled_users}</CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Ban className="h-4 w-4" /> Blocked IPs</CardTitle></CardHeader>
          <CardContent>
            {data.blocked_ips.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No blocked IPs</p>
            ) : (
              <ul className="space-y-1">{data.blocked_ips.map((ip) => <li key={ip} className="font-mono text-sm">{ip}</li>)}</ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Monitor className="h-4 w-4" /> Password Policy</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>Min length: {String(data.password_policy.min_length ?? 8)}</p>
            <p>Require uppercase: {data.password_policy.require_uppercase ? "Yes" : "No"}</p>
            <p>Require number: {data.password_policy.require_number ? "Yes" : "No"}</p>
          </CardContent>
        </Card>
      </div>

      {data.open_events.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Open Events</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.open_events.map((e) => (
              <div key={String(e.id)} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
                <span>{String(e.description)}</span>
                <Badge variant="outline">{String(e.severity)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
