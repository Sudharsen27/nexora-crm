"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Unplug, Zap } from "lucide-react";
import { IntegrationsNavTabs } from "@/components/integrations/integrations-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  connectIntegration,
  disconnectIntegration,
  getIntegration,
  getIntegrationHealth,
  getOAuthAuthorizeUrl,
  reconnectIntegration,
  syncIntegration,
} from "@/lib/api/integrations";
import type { IntegrationDetail, IntegrationHealth } from "@/types/integrations";

interface IntegrationDetailPageProps {
  tenantSlug: string;
  integrationId: string;
}

export function IntegrationDetailPage({ tenantSlug, integrationId }: IntegrationDetailPageProps) {
  const [integration, setIntegration] = useState<IntegrationDetail | null>(null);
  const [health, setHealth] = useState<IntegrationHealth | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [detail, healthData] = await Promise.all([
        getIntegration(tenantSlug, integrationId),
        getIntegrationHealth(tenantSlug, integrationId),
      ]);
      setIntegration(detail);
      setHealth(healthData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load integration");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [tenantSlug, integrationId]);

  async function handleConnect() {
    if (!integration) return;
    setBusy(true);
    try {
      if (integration.auth_type === "oauth2") {
        const { authorize_url, state } = await getOAuthAuthorizeUrl(tenantSlug, integrationId);
        sessionStorage.setItem("oauth_state", state);
        window.location.href = authorize_url;
        return;
      }
      const updated = await connectIntegration(tenantSlug, integrationId, { api_key: apiKey });
      setIntegration(updated);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error || !integration) {
    return <WidgetError title="Integration not found" message={error ?? "Not found"} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Link
            href={`/${tenantSlug}/integrations/installed`}
            className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Installed apps
          </Link>
          <h1 className="text-2xl font-bold">{integration.app_name}</h1>
          <div className="flex gap-2">
            <Badge>{integration.status}</Badge>
            <Badge variant="outline">{integration.health}</Badge>
          </div>
        </div>
        <IntegrationsNavTabs tenantSlug={tenantSlug} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Connection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {integration.auth_type === "api_key" && integration.status !== "connected" ? (
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                />
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {integration.status !== "connected" ? (
                <Button onClick={() => void handleConnect()} disabled={busy}>
                  <Zap className="mr-2 h-4 w-4" />
                  Connect
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setBusy(true);
                      await syncIntegration(tenantSlug, integrationId);
                      await load();
                      setBusy(false);
                    }}
                    disabled={busy}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync now
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setBusy(true);
                      setIntegration(await reconnectIntegration(tenantSlug, integrationId));
                      setBusy(false);
                    }}
                    disabled={busy}
                  >
                    Reconnect
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      setBusy(true);
                      setIntegration(await disconnectIntegration(tenantSlug, integrationId));
                      setBusy(false);
                    }}
                    disabled={busy}
                  >
                    <Unplug className="mr-2 h-4 w-4" />
                    Disconnect
                  </Button>
                </>
              )}
            </div>
            {integration.last_error ? (
              <p className="text-sm text-red-600">{integration.last_error}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-[var(--border)]/70 bg-[var(--surface)]/70 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-base">Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {health?.checks.map((check) => (
              <div key={check.name} className="flex justify-between text-sm">
                <span className="capitalize">{check.name}</span>
                <Badge variant={check.status === "pass" ? "secondary" : "destructive"}>{check.status}</Badge>
              </div>
            ))}
            {health?.latency_ms != null ? (
              <p className="text-xs text-[var(--muted-foreground)]">Latency: {health.latency_ms}ms</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
