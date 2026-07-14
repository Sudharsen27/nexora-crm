"use client";

import { AgentsNavTabs } from "@/components/agents/agents-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgentRecommendations } from "@/hooks/use-agents";
import { updateRecommendation } from "@/lib/api/agents";

interface AgentsRecommendationsPageProps {
  tenantSlug: string;
}

export function AgentsRecommendationsPage({ tenantSlug }: AgentsRecommendationsPageProps) {
  const { data, loading, error, refresh } = useAgentRecommendations(tenantSlug);

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error) return <WidgetError title="Recommendations" message={error} onRetry={() => void refresh()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Recommendations</h1>
      </div>
      <AgentsNavTabs tenantSlug={tenantSlug} />
      <Card>
        <CardHeader>
          <CardTitle>Pending actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(data ?? []).length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No pending recommendations.</p>
          ) : (
            data!.map((rec) => (
              <div key={rec.id} className="rounded-lg border border-[var(--border)] px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{rec.title}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{rec.description}</p>
                    <div className="mt-1 flex gap-2">
                      <Badge variant="outline">{rec.category}</Badge>
                      <Badge variant="outline">{Math.round(rec.confidence * 100)}% confidence</Badge>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      onClick={() => void updateRecommendation(tenantSlug, rec.id, "accepted").then(() => refresh())}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void updateRecommendation(tenantSlug, rec.id, "dismissed").then(() => refresh())}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
