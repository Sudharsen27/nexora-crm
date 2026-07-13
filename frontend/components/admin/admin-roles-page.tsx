"use client";

import { AdminNavTabs } from "@/components/admin/admin-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePermissionMatrix } from "@/hooks/use-admin";

interface AdminRolesPageProps {
  tenantSlug: string;
}

export function AdminRolesPage({ tenantSlug }: AdminRolesPageProps) {
  const { data, loading, error, refresh } = usePermissionMatrix(tenantSlug);

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error || !data) return <WidgetError title="Roles" message={error ?? "Failed"} onRetry={() => void refresh()} />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Roles & Permissions</h1></div>
      <AdminNavTabs tenantSlug={tenantSlug} />
      <div className="grid gap-4 lg:grid-cols-3">
        {data.roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                {role.name}
                {role.is_system && <Badge variant="outline">System</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-xs text-[var(--muted-foreground)]">{role.permissions.length} permissions</p>
              <div className="flex max-h-40 flex-wrap gap-1 overflow-y-auto">
                {role.permissions.slice(0, 20).map((p) => (
                  <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
                ))}
                {role.permissions.length > 20 && <Badge variant="outline">+{role.permissions.length - 20}</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle>Permission catalog ({data.permissions.length})</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-1">
          {data.permissions.map((p) => (
            <Badge key={p.slug} variant="outline" className="text-[10px]">{p.slug}</Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
