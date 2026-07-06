"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getPortalDeals } from "@/lib/api/portal";
import type { PortalDeal } from "@/types/portal";

export function PortalDealsPage({ tenantSlug }: { tenantSlug: string }) {
  const [deals, setDeals] = useState<PortalDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getPortalDeals(tenantSlug)
      .then(setDeals)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load deals"))
      .finally(() => setLoading(false));
  }, [tenantSlug]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">Your deals</h1>
      {loading && <p className="text-sm text-[var(--muted-foreground)]">Loading deals…</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {!loading && !error && deals.length === 0 && (
        <p className="rounded-xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--muted-foreground)]">
          No deals linked to your account yet. Ask your account manager to link deals to your contact in the CRM.
        </p>
      )}
      <div className="space-y-3">
        {deals.map((deal) => (
          <Link key={deal.id} href={`/portal/${tenantSlug}/deals/${deal.id}`}>
            <Card className="transition hover:border-sky-500/30 hover:shadow-md">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-semibold">{deal.title}</p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {deal.stage_label}
                    {deal.expected_close_date && ` · Close ${deal.expected_close_date}`}
                  </p>
                </div>
                <div className="text-right">
                  {deal.value && (
                    <p className="font-medium">
                      {deal.currency} {Number(deal.value).toLocaleString()}
                    </p>
                  )}
                  <Badge variant="secondary">{deal.probability}%</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
