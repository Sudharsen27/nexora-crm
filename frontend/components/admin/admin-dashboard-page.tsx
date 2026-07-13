"use client";

import { Shield, Users, Activity, Key, Database, Flag, AlertTriangle } from "lucide-react";
import { AdminNavTabs } from "@/components/admin/admin-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdminDashboard } from "@/hooks/use-admin";
import { cn } from "@/lib/utils";

interface AdminDashboardPageProps {
  tenantSlug: string;
}

export function AdminDashboardPage({ tenantSlug }: AdminDashboardPageProps) {
  const { data, loading, error, refresh } = useAdminDashboard(tenantSlug);

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error || !data) return <WidgetError title="Admin Console" message={error ?? "Failed"} onRetry={() => void refresh()} />;

  const scoreColor =
    data.security_score >= 80 ? "text-emerald-600" : data.security_score >= 60 ? "text-amber-600" : "text-red-600";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Administration</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Enterprise control center for {data.organization_name}
        </p>
      </div>
      <AdminNavTabs tenantSlug={tenantSlug} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-violet-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)]">
              <Shield className="h-4 w-4" /> Security Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn("text-3xl font-bold", scoreColor)}>{data.security_score}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)]">
              <Users className="h-4 w-4" /> Users
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-3xl font-bold">{data.user_count}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)]">
              <Activity className="h-4 w-4" /> Active Sessions
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-3xl font-bold">{data.active_sessions}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-[var(--muted-foreground)]">
              <AlertTriangle className="h-4 w-4" /> Failed Logins (24h)
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-3xl font-bold">{data.failed_logins_24h}</p></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Audit (24h)</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{data.audit_events_24h} events</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Key className="h-4 w-4" /> API Keys</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{data.api_keys_active} active</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" /> Storage</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{data.storage_used_mb} MB</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Flag className="h-4 w-4" /> Platform Status</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge>{data.feature_flags_enabled} features enabled</Badge>
          <Badge variant="outline">{data.custom_fields_count} custom fields</Badge>
          <Badge variant={data.open_security_events > 0 ? "destructive" : "outline"}>
            {data.open_security_events} open security events
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
