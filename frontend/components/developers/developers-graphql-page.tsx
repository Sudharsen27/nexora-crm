"use client";

import { useEffect, useState } from "react";
import { DevelopersNavTabs } from "@/components/developers/developers-nav-tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getGraphqlSchema, runGraphql } from "@/lib/api/developers";

const SAMPLE = `query {
  plugins {
    id
    slug
    name
    pluginType
    avgRating
  }
}`;

interface DevelopersGraphqlPageProps {
  tenantSlug: string;
}

export function DevelopersGraphqlPage({ tenantSlug }: DevelopersGraphqlPageProps) {
  const [sdl, setSdl] = useState("");
  const [query, setQuery] = useState(SAMPLE);
  const [result, setResult] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getGraphqlSchema(tenantSlug).then((r) => setSdl(r.sdl)).catch(() => undefined);
  }, [tenantSlug]);

  async function run() {
    setBusy(true);
    try {
      const res = await runGraphql(tenantSlug, query);
      setResult(JSON.stringify(res, null, 2));
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Query failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">GraphQL</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Schema explorer with queries, mutations, and subscription surface.
        </p>
      </div>
      <DevelopersNavTabs tenantSlug={tenantSlug} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schema (SDL)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[420px] overflow-auto rounded-lg bg-[var(--surface-muted)] p-4 text-xs">{sdl}</pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Query playground</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              className="min-h-[180px] w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 font-mono text-xs"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button onClick={() => void run()} disabled={busy} className="bg-teal-600 hover:bg-teal-700">
              {busy ? "Running…" : "Run query"}
            </Button>
            {result && (
              <pre className="max-h-[240px] overflow-auto rounded-lg bg-[var(--surface-muted)] p-4 text-xs">{result}</pre>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
