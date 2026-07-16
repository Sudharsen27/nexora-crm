"use client";

import { DevelopersNavTabs } from "@/components/developers/developers-nav-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDeveloperDashboard } from "@/hooks/use-developers";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";

interface DevelopersDocsPageProps {
  tenantSlug: string;
}

export function DevelopersDocsPage({ tenantSlug }: DevelopersDocsPageProps) {
  const { data, loading, error, refresh } = useDeveloperDashboard(tenantSlug);

  if (loading) return <WidgetSkeleton variant="list" />;
  if (error || !data) {
    return <WidgetError title="Docs" message={error ?? "Failed"} onRetry={() => void refresh()} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Developer Documentation</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          API, SDK, webhooks, CLI, samples, and sandbox testing guides.
        </p>
      </div>
      <DevelopersNavTabs tenantSlug={tenantSlug} />

      <div className="grid gap-4 md:grid-cols-2">
        {data.docs.map((doc) => (
          <Card key={doc.slug}>
            <CardHeader>
              <CardTitle className="text-base">{doc.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-[var(--muted-foreground)]">
              <p>{doc.summary}</p>
              <pre className="overflow-x-auto rounded-lg bg-[var(--surface-muted)] p-3 font-mono text-xs text-[var(--foreground)]">
                {doc.slug === "rest-api"
                  ? `Authorization: Bearer <jwt>\nGET /api/v1/tenants/{slug}/companies`
                  : doc.slug === "graphql"
                    ? `POST /api/v1/tenants/{slug}/developers/graphql\n{ "query": "{ plugins { name } }" }`
                    : doc.slug === "webhooks"
                      ? `X-Nexora-Signature: sha256=...\nX-Nexora-Event: deal.won`
                      : doc.slug === "cli"
                        ? `nexora plugin create my-plugin\nnexora plugin publish`
                        : `import { definePlugin } from '@nexora/plugin-sdk'`}
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
