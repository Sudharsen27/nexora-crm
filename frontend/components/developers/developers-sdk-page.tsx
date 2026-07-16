"use client";

import { useState } from "react";
import { DevelopersNavTabs } from "@/components/developers/developers-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSdkProjects } from "@/hooks/use-developers";
import { createSdkProject } from "@/lib/api/developers";

interface DevelopersSdkPageProps {
  tenantSlug: string;
}

export function DevelopersSdkPage({ tenantSlug }: DevelopersSdkPageProps) {
  const { data, loading, error, refresh } = useSdkProjects(tenantSlug);
  const [name, setName] = useState("My Plugin");
  const [type, setType] = useState("plugin");
  const [busy, setBusy] = useState(false);

  async function onCreate() {
    setBusy(true);
    try {
      await createSdkProject(tenantSlug, { name, project_type: type });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <WidgetSkeleton variant="list" />;
  if (error) return <WidgetError title="SDK" message={error} onRetry={() => void refresh()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Plugin · Widget · Theme SDK</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Scaffold sandboxed extensions with lazy loading and permission manifests.
        </p>
      </div>
      <DevelopersNavTabs tenantSlug={tenantSlug} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New SDK project</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" />
          <select
            className="h-10 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="plugin">Plugin</option>
            <option value="widget">Widget</option>
            <option value="theme">Theme</option>
            <option value="connector">Connector</option>
          </select>
          <Button onClick={() => void onCreate()} disabled={busy} className="bg-teal-600 hover:bg-teal-700">
            Create
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {(data ?? []).map((project) => (
          <Card key={project.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{project.name}</span>
                <Badge variant="outline">{project.project_type}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-lg bg-[var(--surface-muted)] p-4 text-xs">
                {project.sample_code ?? "// no sample"}
              </pre>
            </CardContent>
          </Card>
        ))}
        {(data ?? []).length === 0 && (
          <p className="text-sm text-[var(--muted-foreground)]">Create your first SDK project above.</p>
        )}
      </div>
    </div>
  );
}
