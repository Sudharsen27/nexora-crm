"use client";

import { AdminNavTabs } from "@/components/admin/admin-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdminSessions } from "@/hooks/use-admin";
import { revokeAllSessions, terminateSession } from "@/lib/api/admin";

interface AdminSessionsPageProps {
  tenantSlug: string;
}

export function AdminSessionsPage({ tenantSlug }: AdminSessionsPageProps) {
  const { data, loading, error, refresh } = useAdminSessions(tenantSlug);

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error) return <WidgetError title="Sessions" message={error} onRetry={() => void refresh()} />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Session Management</h1>
        <Button variant="outline" onClick={() => void revokeAllSessions(tenantSlug).then(() => refresh())}>
          Revoke all my sessions
        </Button>
      </div>
      <AdminNavTabs tenantSlug={tenantSlug} />
      <Card>
        <CardHeader><CardTitle>Active sessions</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(data ?? []).length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No active sessions</p>
          ) : (
            data!.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{s.device_name ?? "Unknown device"}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{s.ip_address} · {new Date(s.created_at).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{s.status}</Badge>
                  <Button size="sm" variant="outline" onClick={() => void terminateSession(tenantSlug, s.id).then(() => refresh())}>
                    Terminate
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
