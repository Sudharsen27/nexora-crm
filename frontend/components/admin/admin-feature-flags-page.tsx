"use client";

import { AdminNavTabs } from "@/components/admin/admin-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFeatureFlags } from "@/hooks/use-admin";
import { updateFeatureFlag } from "@/lib/api/admin";

interface AdminFeatureFlagsPageProps {
  tenantSlug: string;
}

export function AdminFeatureFlagsPage({ tenantSlug }: AdminFeatureFlagsPageProps) {
  const { data, loading, error, refresh } = useFeatureFlags(tenantSlug);

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error) return <WidgetError title="Feature Flags" message={error} onRetry={() => void refresh()} />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Feature Flags</h1></div>
      <AdminNavTabs tenantSlug={tenantSlug} />
      <Card>
        <CardHeader><CardTitle>Module toggles</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(data ?? []).map((flag) => (
            <label key={flag.id} className="flex cursor-pointer items-center justify-between rounded-lg border border-[var(--border)] px-3 py-3">
              <div>
                <p className="font-medium">{flag.name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{flag.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={flag.enabled ? "default" : "outline"}>{flag.key}</Badge>
                <input
                  type="checkbox"
                  checked={flag.enabled}
                  onChange={(e) => void updateFeatureFlag(tenantSlug, flag.id, e.target.checked).then(() => refresh())}
                />
              </div>
            </label>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
