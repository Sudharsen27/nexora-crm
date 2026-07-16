"use client";

import { useState } from "react";
import { DevelopersNavTabs } from "@/components/developers/developers-nav-tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { runCli } from "@/lib/api/developers";
import type { CliResult } from "@/types/developers";

const ACTIONS = [
  { action: "create-plugin", label: "Create plugin" },
  { action: "generate-widget", label: "Generate widget" },
  { action: "validate", label: "Validate" },
  { action: "package", label: "Package" },
  { action: "publish", label: "Publish" },
  { action: "deploy", label: "Deploy" },
];

interface DevelopersCliPageProps {
  tenantSlug: string;
}

export function DevelopersCliPage({ tenantSlug }: DevelopersCliPageProps) {
  const [name, setName] = useState("demo-plugin");
  const [result, setResult] = useState<CliResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: string) {
    setBusy(true);
    try {
      const res = await runCli(tenantSlug, { action, name, version: "1.0.0" });
      setResult(res);
    } catch (err) {
      setResult({
        success: false,
        action,
        message: err instanceof Error ? err.message : "CLI failed",
        output: {},
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Nexora CLI</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Create, validate, package, publish, and deploy plugins from the Developer Console.
        </p>
      </div>
      <DevelopersNavTabs tenantSlug={tenantSlug} />

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="project name" className="font-mono" />
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map((a) => (
              <Button key={a.action} size="sm" variant="outline" disabled={busy} onClick={() => void run(a.action)}>
                {a.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Terminal output</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="min-h-[160px] overflow-x-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs text-emerald-400">
            {result
              ? `$ nexora ${result.action} ${name}\n${result.message}\n${JSON.stringify(result.output, null, 2)}`
              : "$ nexora --help\nReady. Choose a command above."}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Local CLI</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-[var(--muted-foreground)]">
          <p>From the backend folder:</p>
          <pre className="rounded-lg bg-[var(--surface-muted)] p-3 font-mono text-xs text-[var(--foreground)]">
            {`python -m scripts.nexora_cli plugin create my-plugin
python -m scripts.nexora_cli widget generate revenue-chart
python -m scripts.nexora_cli plugin validate
python -m scripts.nexora_cli plugin package
python -m scripts.nexora_cli plugin publish`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
