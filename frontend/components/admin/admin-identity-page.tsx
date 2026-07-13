"use client";

import { useState } from "react";
import { AdminNavTabs } from "@/components/admin/admin-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSsoProviders } from "@/hooks/use-admin";
import { setupMfa, verifyMfa } from "@/lib/api/admin";

interface AdminIdentityPageProps {
  tenantSlug: string;
}

export function AdminIdentityPage({ tenantSlug }: AdminIdentityPageProps) {
  const { data, loading, error, refresh } = useSsoProviders(tenantSlug);
  const [mfaSetup, setMfaSetup] = useState<{ secret: string; backup_codes: string[] } | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error) return <WidgetError title="Identity" message={error} onRetry={() => void refresh()} />;

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Identity & SSO</h1></div>
      <AdminNavTabs tenantSlug={tenantSlug} />
      {message && <p className="text-sm text-indigo-600">{message}</p>}

      <Card>
        <CardHeader><CardTitle>SSO Providers</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {(data ?? []).map((p) => (
            <div key={p.provider} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-3 capitalize">
              <span className="font-medium">{p.provider.replace("_", " ")}</span>
              <div className="flex gap-2">
                <Badge variant={p.enabled ? "default" : "outline"}>{p.enabled ? "On" : "Off"}</Badge>
                <Badge variant="outline">{p.configured ? "Configured" : "Demo"}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>MFA (TOTP)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={() => void setupMfa(tenantSlug).then((r) => setMfaSetup(r))}>Setup MFA</Button>
          {mfaSetup && (
            <div className="rounded-lg border border-[var(--border)] p-3 text-sm">
              <p>Secret: <code>{mfaSetup.secret}</code></p>
              <p className="mt-2">Backup codes: {mfaSetup.backup_codes.join(", ")}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Input placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />
            <Button
              variant="outline"
              onClick={() =>
                void verifyMfa(tenantSlug, code).then(() => {
                  setMessage("MFA enabled successfully");
                  setMfaSetup(null);
                  setCode("");
                })
              }
            >
              Verify
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
