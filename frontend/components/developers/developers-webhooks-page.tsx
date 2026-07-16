"use client";

import { useState } from "react";
import { DevelopersNavTabs } from "@/components/developers/developers-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePlatformWebhooks, useWebhookLogs } from "@/hooks/use-developers";
import { createWebhook, deleteWebhook, retryWebhookLog, testWebhook } from "@/lib/api/developers";

interface DevelopersWebhooksPageProps {
  tenantSlug: string;
}

export function DevelopersWebhooksPage({ tenantSlug }: DevelopersWebhooksPageProps) {
  const webhooks = usePlatformWebhooks(tenantSlug);
  const logs = useWebhookLogs(tenantSlug);
  const [name, setName] = useState("CRM Events Hook");
  const [url, setUrl] = useState("https://example.com/webhooks/nexora");
  const [busy, setBusy] = useState(false);

  async function onCreate() {
    setBusy(true);
    try {
      await createWebhook(tenantSlug, {
        name,
        url,
        events: ["deal.*", "lead.*", "plugin.*"],
      });
      await webhooks.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (webhooks.loading) return <WidgetSkeleton variant="list" />;
  if (webhooks.error) {
    return <WidgetError title="Webhooks" message={webhooks.error} onRetry={() => void webhooks.refresh()} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Webhook Platform</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Create endpoints, test deliveries, retry failures, and rotate secrets.
        </p>
      </div>
      <DevelopersNavTabs tenantSlug={tenantSlug} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create webhook</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="sm:flex-1" />
          <Button onClick={() => void onCreate()} disabled={busy} className="bg-teal-600 hover:bg-teal-700">
            Create
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {(webhooks.data ?? []).map((wh) => (
          <Card key={wh.id}>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{wh.name}</p>
                <p className="text-xs text-[var(--muted-foreground)] break-all">{wh.url}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="outline">{wh.status}</Badge>
                  <Badge variant="secondary">{wh.success_count} ok</Badge>
                  <Badge variant="destructive">{wh.failure_count} fail</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    await testWebhook(tenantSlug, wh.id);
                    await logs.refresh();
                    await webhooks.refresh();
                  }}
                >
                  Test
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    await deleteWebhook(tenantSlug, wh.id);
                    await webhooks.refresh();
                  }}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivery logs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(logs.data ?? []).map((log) => (
            <div key={log.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] p-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium truncate">{log.event_type}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {log.status_code ?? "—"} · {log.duration_ms}ms · attempt {log.attempt}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={log.status === "success" ? "default" : "destructive"}>{log.status}</Badge>
                {log.status === "failed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await retryWebhookLog(tenantSlug, log.id);
                      await logs.refresh();
                    }}
                  >
                    Retry
                  </Button>
                )}
              </div>
            </div>
          ))}
          {(logs.data ?? []).length === 0 && (
            <p className="text-sm text-[var(--muted-foreground)]">No deliveries logged.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
