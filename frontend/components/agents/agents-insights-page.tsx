"use client";

import { AgentsNavTabs } from "@/components/agents/agents-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAgentInsights } from "@/hooks/use-agents";
import { markInsightRead } from "@/lib/api/agents";

interface AgentsInsightsPageProps {
  tenantSlug: string;
}

export function AgentsInsightsPage({ tenantSlug }: AgentsInsightsPageProps) {
  const { data, loading, error, refresh } = useAgentInsights(tenantSlug);

  if (loading) return <WidgetSkeleton variant="chart" />;
  if (error) return <WidgetError title="Insights" message={error} onRetry={() => void refresh()} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Insights</h1>
      </div>
      <AgentsNavTabs tenantSlug={tenantSlug} />
      <div className="grid gap-3">
        {(data ?? []).length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-[var(--muted-foreground)]">No insights yet.</CardContent>
          </Card>
        ) : (
          data!.map((insight) => (
            <Card key={insight.id} className={insight.is_read ? "opacity-70" : ""}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{insight.title}</span>
                  <Badge variant="outline">{insight.severity}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-[var(--muted-foreground)]">{insight.summary}</p>
                {!insight.is_read && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void markInsightRead(tenantSlug, insight.id).then(() => refresh())}
                  >
                    Mark read
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
