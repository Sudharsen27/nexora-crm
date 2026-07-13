"use client";

import { AdminNavTabs } from "@/components/admin/admin-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuditLogs } from "@/hooks/use-admin";

interface AdminAuditPageProps {
  tenantSlug: string;
}

export function AdminAuditPage({ tenantSlug }: AdminAuditPageProps) {
  const { data, loading, error, refresh } = useAuditLogs(tenantSlug);

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error) return <WidgetError title="Audit Logs" message={error} onRetry={() => void refresh()} />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Audit Logs</h1></div>
      <AdminNavTabs tenantSlug={tenantSlug} />
      <Card>
        <CardHeader><CardTitle>Compliance trail</CardTitle></CardHeader>
        <CardContent>
          {(data ?? []).length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No audit events yet. Actions in admin console will appear here.</p>
          ) : (
            <div className="space-y-2">
              {data!.map((log) => (
                <div key={log.id} className="flex flex-col gap-1 rounded-lg border border-[var(--border)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">{log.description}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{log.resource} · {new Date(log.created_at).toLocaleString()}</p>
                  </div>
                  <Badge variant="outline">{log.action}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
