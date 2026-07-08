"use client";

import { useEffect, useState } from "react";
import { IntegrationsNavTabs } from "@/components/integrations/integrations-nav-tabs";
import { WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createWebhook, deleteWebhook, listWebhooks, testWebhook } from "@/lib/api/integrations";
import type { WebhookItem } from "@/types/integrations";

interface IntegrationsWebhooksPageProps {
  tenantSlug: string;
}

export function IntegrationsWebhooksPage({ tenantSlug }: IntegrationsWebhooksPageProps) {
  const [hooks, setHooks] = useState<WebhookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      setHooks(await listWebhooks(tenantSlug));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, [tenantSlug]);

  async function handleCreate() {
    if (!name.trim() || !url.trim()) return;
    await createWebhook(tenantSlug, { name, url });
    setName("");
    setUrl("");
    await refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Webhooks</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Build outbound automations and event listeners.</p>
        </div>
        <IntegrationsNavTabs tenantSlug={tenantSlug} />
      </div>

      <Card className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-base">Create Webhook</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="wh-name">Name</Label>
            <Input id="wh-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wh-url">Endpoint URL</Label>
            <Input id="wh-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
          <Button className="sm:col-span-2 w-fit" onClick={() => void handleCreate()}>
            Add webhook
          </Button>
        </CardContent>
      </Card>

      {loading ? <WidgetSkeleton variant="list" /> : null}

      <div className="space-y-3">
        {hooks.map((hook) => (
          <Card key={hook.id} className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{hook.name}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{hook.url}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{hook.status}</Badge>
                <Button size="sm" variant="outline" onClick={() => void testWebhook(tenantSlug, hook.id)}>
                  Test
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void deleteWebhook(tenantSlug, hook.id).then(refresh)}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
