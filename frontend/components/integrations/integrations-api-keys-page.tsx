"use client";

import { useEffect, useState } from "react";
import { IntegrationsNavTabs } from "@/components/integrations/integrations-nav-tabs";
import { WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/api/integrations";
import type { ApiKeyItem } from "@/types/integrations";

interface IntegrationsApiKeysPageProps {
  tenantSlug: string;
}

export function IntegrationsApiKeysPage({ tenantSlug }: IntegrationsApiKeysPageProps) {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      setKeys(await listApiKeys(tenantSlug));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [tenantSlug]);

  async function handleCreate() {
    if (!name.trim()) return;
    const created = await createApiKey(tenantSlug, { name });
    setNewKey(created.api_key);
    setName("");
    await refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Developer access for REST and GraphQL APIs.</p>
        </div>
        <IntegrationsNavTabs tenantSlug={tenantSlug} />
      </div>

      <Card className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-base">Generate API Key</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1 space-y-2">
            <Label htmlFor="key-name">Key name</Label>
            <Input id="key-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <Button onClick={() => void handleCreate()}>Generate</Button>
        </CardContent>
      </Card>

      {newKey ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium">Copy your API key now — it won&apos;t be shown again.</p>
            <code className="mt-2 block break-all rounded-lg bg-[var(--surface-muted)] p-3 text-xs">{newKey}</code>
          </CardContent>
        </Card>
      ) : null}

      {loading ? <WidgetSkeleton variant="list" /> : null}

      <div className="space-y-3">
        {keys.map((key) => (
          <Card key={key.id} className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{key.name}</p>
                <p className="font-mono text-xs text-[var(--muted-foreground)]">{key.key_prefix}••••••••</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{key.status}</Badge>
                <span className="text-xs text-[var(--muted-foreground)]">{key.usage_count} calls</span>
                {key.status === "active" ? (
                  <Button size="sm" variant="ghost" onClick={() => void revokeApiKey(tenantSlug, key.id).then(refresh)}>
                    Revoke
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
