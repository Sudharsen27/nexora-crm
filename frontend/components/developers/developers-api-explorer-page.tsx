"use client";

import { useState } from "react";
import { DevelopersNavTabs } from "@/components/developers/developers-nav-tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { runApiExplorer } from "@/lib/api/developers";
import type { RestExplorerResult } from "@/types/developers";

const PRESETS = ["/companies", "/contacts", "/deals", "/leads", "/plugins", "/webhooks", "/ai/agents", "/reports"];

interface DevelopersApiExplorerPageProps {
  tenantSlug: string;
}

export function DevelopersApiExplorerPage({ tenantSlug }: DevelopersApiExplorerPageProps) {
  const [method, setMethod] = useState("GET");
  const [path, setPath] = useState("/companies");
  const [result, setResult] = useState<RestExplorerResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await runApiExplorer(tenantSlug, { method, path });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">REST API Explorer</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Authenticated sandbox for Companies, Contacts, Deals, Leads, AI, Reports, and more.
        </p>
      </div>
      <DevelopersNavTabs tenantSlug={tenantSlug} />

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <select
            className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            {["GET", "POST", "PATCH", "DELETE"].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <Input value={path} onChange={(e) => setPath(e.target.value)} className="font-mono sm:flex-1" />
          <Button onClick={() => void run()} disabled={busy} className="bg-teal-600 hover:bg-teal-700">
            {busy ? "Sending…" : "Send"}
          </Button>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button key={p} size="sm" variant="outline" onClick={() => setPath(p)}>
            {p}
          </Button>
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {result.status_code} · {result.duration_ms}ms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-[var(--surface-muted)] p-4 text-xs">
              {JSON.stringify(result.body, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
