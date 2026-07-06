"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PortalPageError, PortalPageLoading } from "@/components/portal/portal-page-state";
import { getPortalDeal } from "@/lib/api/portal";
import type { PortalDealDetail } from "@/types/portal";

export function PortalDealDetailPage({ tenantSlug, dealId }: { tenantSlug: string; dealId: string }) {
  const [deal, setDeal] = useState<PortalDealDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getPortalDeal(tenantSlug, dealId)
      .then(setDeal)
      .catch((e) => setError(e instanceof Error ? e.message : "Deal not found"))
      .finally(() => setLoading(false));
  }, [tenantSlug, dealId]);

  if (loading) return <PortalPageLoading label="Loading deal…" />;
  if (error || !deal) return <PortalPageError message={error ?? "Deal not found"} />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/portal/${tenantSlug}/deals`}
        className="inline-flex items-center gap-1 text-sm text-sky-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to deals
      </Link>

      <div>
        <Badge>{deal.stage_label}</Badge>
        <h1 className="mt-2 text-2xl font-bold">{deal.title}</h1>
        {deal.value && (
          <p className="text-lg text-[var(--muted-foreground)]">
            {deal.currency} {Number(deal.value).toLocaleString()} · {deal.probability}% probability
          </p>
        )}
        {deal.expected_close_date && (
          <p className="text-sm text-[var(--muted-foreground)]">
            Expected close: {new Date(deal.expected_close_date).toLocaleDateString()}
          </p>
        )}
      </div>

      {deal.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{deal.description}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {deal.timeline.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">No activity on this deal yet.</p>
          ) : (
            deal.timeline.map((item) => (
              <div key={item.id} className="border-l-2 border-sky-500/30 pl-3">
                <p className="text-sm font-medium">{item.title}</p>
                {item.detail && (
                  <p className="text-xs text-[var(--muted-foreground)]">{item.detail}</p>
                )}
                <p className="text-xs text-[var(--muted-foreground)]">
                  {new Date(item.occurred_at).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
