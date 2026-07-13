"use client";

import { useState } from "react";
import { AdminNavTabs } from "@/components/admin/admin-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAdminApiKeys } from "@/hooks/use-admin";
import { createAdminApiKey, revokeAdminApiKey } from "@/lib/api/admin";

interface AdminApiKeysPageProps {
  tenantSlug: string;
}

export function AdminApiKeysPage({ tenantSlug }: AdminApiKeysPageProps) {
  const { data, loading, error, refresh } = useAdminApiKeys(tenantSlug);
  const [name, setName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    const result = await createAdminApiKey(tenantSlug, { name: name.trim(), scopes: ["read", "write"] });
    setCreatedKey(result.api_key);
    setName("");
    await refresh();
  }

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error) return <WidgetError title="API Keys" message={error} onRetry={() => void refresh()} />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">API Management</h1></div>
      <AdminNavTabs tenantSlug={tenantSlug} />
      {createdKey && (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="pt-4">
            <p className="text-sm font-medium">New API key (copy now):</p>
            <code className="mt-1 block break-all text-xs">{createdKey}</code>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle>Generate API Key</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Key name" value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={() => void handleCreate()}>Generate</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Active keys</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(data ?? []).map((k) => (
            <div key={k.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2">
              <div>
                <p className="font-medium">{k.name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{k.key_prefix}… · {k.usage_count} calls</p>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">{k.rate_limit_per_hour}/hr</Badge>
                <Button size="sm" variant="outline" onClick={() => void revokeAdminApiKey(tenantSlug, k.id).then(() => refresh())}>Revoke</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
