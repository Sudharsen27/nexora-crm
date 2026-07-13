"use client";

import { useState } from "react";
import { AdminNavTabs } from "@/components/admin/admin-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useOrganizationPolicy } from "@/hooks/use-admin";
import { updateOrganizationPolicy } from "@/lib/api/admin";

interface AdminOrganizationPageProps {
  tenantSlug: string;
}

export function AdminOrganizationPage({ tenantSlug }: AdminOrganizationPageProps) {
  const { data, loading, error, refresh } = useOrganizationPolicy(tenantSlug);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(patch: Record<string, unknown>) {
    setBusy(true);
    try {
      await updateOrganizationPolicy(tenantSlug, patch);
      setMessage("Organization settings saved");
      await refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error || !data) return <WidgetError title="Organization" message={error ?? "Failed"} onRetry={() => void refresh()} />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Organization</h1></div>
      <AdminNavTabs tenantSlug={tenantSlug} />
      {message && <p className="text-sm text-indigo-600">{message}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Branding & Localization</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input defaultValue={data.logo_url ?? ""} id="logo" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input defaultValue={data.timezone} id="tz" />
              </div>
              <div className="space-y-2">
                <Label>Locale</Label>
                <Input defaultValue={data.locale} id="locale" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Primary color</Label>
              <Input defaultValue={data.primary_color} id="color" type="color" className="h-10" />
            </div>
            <Button
              disabled={busy}
              onClick={() => {
                const logo = (document.getElementById("logo") as HTMLInputElement).value;
                const tz = (document.getElementById("tz") as HTMLInputElement).value;
                const locale = (document.getElementById("locale") as HTMLInputElement).value;
                const color = (document.getElementById("color") as HTMLInputElement).value;
                void save({ logo_url: logo || null, timezone: tz, locale, primary_color: color });
              }}
            >
              Save branding
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>System</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center justify-between text-sm">
              <span>Maintenance mode</span>
              <input
                type="checkbox"
                checked={data.maintenance_mode}
                onChange={(e) => void save({ maintenance_mode: e.target.checked })}
              />
            </label>
            <div className="space-y-1 text-sm text-[var(--muted-foreground)]">
              <div className="flex items-center gap-2">
                <span>Currency:</span>
                <Badge variant="outline">{data.currency}</Badge>
              </div>
              <p>Custom domains: {data.custom_domains.length || "None"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
