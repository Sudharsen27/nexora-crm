"use client";

import { useState } from "react";
import {
  Bell,
  Cloud,
  CloudOff,
  Database,
  Download,
  RefreshCw,
  Smartphone,
  Trash2,
  Wifi,
} from "lucide-react";
import { OfflineBanner } from "@/components/mobile/offline-banner";
import { usePwa } from "@/components/mobile/pwa-provider";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMobileDashboard, useMobileSettings, useOfflineSync } from "@/hooks/use-mobile";
import { subscribePush } from "@/lib/api/mobile";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface MobileHubPageProps {
  tenantSlug: string;
}

export function MobileHubPage({ tenantSlug }: MobileHubPageProps) {
  const { dashboard, loading, error, refresh, online } = useMobileDashboard(tenantSlug);
  const { settings, update } = useMobileSettings(tenantSlug);
  const { syncing, lastResult, history, sync, download, clearCache } = useOfflineSync(tenantSlug);
  const { isInstalled, canInstall, swReady, promptInstall } = usePwa();
  const [pushBusy, setPushBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    try {
      const result = await sync();
      setMessage(`Synced ${result.downloaded} items, uploaded ${result.uploaded}`);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sync failed");
    }
  }

  async function handleDownload() {
    try {
      const count = await download();
      setMessage(`Downloaded ${count} records for offline use`);
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Download failed");
    }
  }

  async function handleClearCache() {
    await clearCache();
    setMessage("Offline cache cleared");
    await refresh();
  }

  async function handleEnablePush() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setMessage("Push notifications not supported in this browser");
      return;
    }
    setPushBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMessage("Notification permission denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U",
        ),
      });
      await subscribePush(tenantSlug, sub, navigator.userAgent);
      await update({ push_enabled: true });
      setMessage("Push notifications enabled");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to enable push");
    } finally {
      setPushBusy(false);
    }
  }

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error) return <WidgetError title="Mobile" message={error} onRetry={() => void refresh()} />;

  return (
    <div className="space-y-6 pb-24 lg:pb-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Smartphone className="h-6 w-6 text-indigo-500" />
          <h1 className="text-2xl font-bold">Mobile & Offline</h1>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          Install Nexora as a native app, work offline, and sync when back online.
        </p>
      </div>

      <OfflineBanner tenantSlug={tenantSlug} onSync={() => void handleSync()} syncing={syncing} />

      {message && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300">
          {message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status</CardDescription>
            <CardTitle className="flex items-center gap-2 text-lg">
              {online ? <Wifi className="h-4 w-4 text-emerald-500" /> : <CloudOff className="h-4 w-4 text-amber-500" />}
              {online ? "Online" : "Offline"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending sync</CardDescription>
            <CardTitle className="text-lg">{dashboard?.offline_queue_pending ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Storage used</CardDescription>
            <CardTitle className="text-lg">{formatBytes(dashboard?.storage_used_bytes ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Conflicts</CardDescription>
            <CardTitle className="text-lg">{dashboard?.open_conflicts ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Install App
            </CardTitle>
            <CardDescription>Add Nexora to your home screen for a native experience.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant={isInstalled ? "default" : "outline"}>
                {isInstalled ? "Installed" : "Not installed"}
              </Badge>
              <Badge variant={swReady ? "default" : "outline"}>
                {swReady ? "Service worker active" : "SW pending"}
              </Badge>
            </div>
            {canInstall && !isInstalled && (
              <Button onClick={() => void promptInstall()}>Install Nexora CRM</Button>
            )}
            {isInstalled && (
              <p className="text-sm text-[var(--muted-foreground)]">
                Nexora is installed. Launch from your home screen for the best experience.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Sync & Cache
            </CardTitle>
            <CardDescription>Download CRM data for offline access.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button onClick={() => void handleSync()} disabled={!online || syncing}>
              <RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
              Sync Now
            </Button>
            <Button variant="outline" onClick={() => void handleDownload()} disabled={!online || syncing}>
              <Database className="mr-2 h-4 w-4" />
              Download Data
            </Button>
            <Button variant="outline" onClick={() => void handleClearCache()} disabled={syncing}>
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Cache
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Push Notifications
            </CardTitle>
            <CardDescription>
              Deal updates, task reminders, meeting alerts, and workflow completions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs text-[var(--muted-foreground)]">
              <Badge variant="outline">Deal updated</Badge>
              <Badge variant="outline">Task due</Badge>
              <Badge variant="outline">Meeting reminder</Badge>
              <Badge variant="outline">Workflow completed</Badge>
              <Badge variant="outline">AI recommendation</Badge>
            </div>
            <Button
              variant="outline"
              onClick={() => void handleEnablePush()}
              disabled={pushBusy || !online || settings?.push_enabled}
            >
              {settings?.push_enabled ? "Push enabled" : "Enable push notifications"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Offline Settings</CardTitle>
            <CardDescription>Control background sync and auto-download.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Offline mode</span>
              <input
                type="checkbox"
                checked={settings?.offline_enabled ?? true}
                onChange={(e) => void update({ offline_enabled: e.target.checked })}
                className="h-4 w-4 rounded"
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Background sync</span>
              <input
                type="checkbox"
                checked={settings?.background_sync ?? true}
                onChange={(e) => void update({ background_sync: e.target.checked })}
                className="h-4 w-4 rounded"
              />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Auto-download data</span>
              <input
                type="checkbox"
                checked={settings?.auto_download ?? true}
                onChange={(e) => void update({ auto_download: e.target.checked })}
                className="h-4 w-4 rounded"
              />
            </label>
          </CardContent>
        </Card>
      </div>

      {lastResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Last sync result</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--muted-foreground)]">
            Downloaded {lastResult.downloaded} · Uploaded {lastResult.uploaded} · Failed {lastResult.failed}
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sync history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {history.slice(0, 5).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
              >
                <span className="capitalize">{session.status}</span>
                <span className="text-[var(--muted-foreground)]">
                  ↑{session.items_uploaded} ↓{session.items_downloaded}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
