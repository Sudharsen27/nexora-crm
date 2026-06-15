"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityFormDialog } from "@/components/activities/activity-form-dialog";
import { ActivityTimeline } from "@/components/activities/activity-timeline";
import { createActivity } from "@/lib/api/activities";
import { formatCurrency, getDeal } from "@/lib/api/deals";
import type { Deal } from "@/types/api";
import { cn } from "@/lib/utils";

const TABS = ["Overview", "Activity"] as const;
type Tab = (typeof TABS)[number];

interface DealDetailPageProps {
  tenantSlug: string;
  dealId: string;
}

export function DealDetailPage({ tenantSlug, dealId }: DealDetailPageProps) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  async function loadDeal() {
    setLoading(true);
    setError(null);
    try {
      const data = await getDeal(tenantSlug, dealId);
      setDeal(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load deal");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDeal();
  }, [tenantSlug, dealId]);

  if (loading) {
    return <p className="text-zinc-500">Loading deal...</p>;
  }

  if (error || !deal) {
    return (
      <div className="space-y-4">
        <Link href={`/${tenantSlug}/deals`} className="inline-flex items-center gap-2 text-sm text-zinc-500">
          <ArrowLeft className="h-4 w-4" />
          Back to deals
        </Link>
        <p className="text-red-600">{error ?? "Deal not found"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href={`/${tenantSlug}/deals`}
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to deals
          </Link>
          <h2 className="text-2xl font-semibold">{deal.title}</h2>
          <p className="text-zinc-500">
            {formatCurrency(deal.value, deal.currency)} · {deal.stage}
          </p>
        </div>
        {activeTab === "Activity" && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Log activity
          </Button>
        )}
      </div>

      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab
                ? "border-b-2 border-zinc-900 text-zinc-900 dark:border-white dark:text-white"
                : "text-zinc-500 hover:text-zinc-700",
            )}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Deal information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-zinc-500">Stage</p>
                <p className="capitalize">{deal.stage}</p>
              </div>
              <div>
                <p className="text-zinc-500">Value</p>
                <p>{formatCurrency(deal.value, deal.currency)}</p>
              </div>
              <div>
                <p className="text-zinc-500">Expected close</p>
                <p>{deal.expected_close_date ?? "—"}</p>
              </div>
              <div>
                <p className="text-zinc-500">Description</p>
                <p>{deal.description ?? "—"}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assigned user</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {deal.assigned_to ? (
                <div>
                  <p className="font-medium">{deal.assigned_to.full_name}</p>
                  <p className="text-zinc-500">{deal.assigned_to.email}</p>
                </div>
              ) : (
                <p className="text-zinc-500">Unassigned</p>
              )}
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Recent activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline
                tenantSlug={tenantSlug}
                entityType="deal"
                entityId={deal.id}
                compact
                pageSize={5}
                refreshKey={refreshKey}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "Activity" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeline
              tenantSlug={tenantSlug}
              entityType="deal"
              entityId={deal.id}
              showDelete
              refreshKey={refreshKey}
            />
          </CardContent>
        </Card>
      )}

      <ActivityFormDialog
        open={formOpen}
        tenantSlug={tenantSlug}
        defaultEntityType="deal"
        defaultEntityId={deal.id}
        lockEntity
        onClose={() => setFormOpen(false)}
        onSubmit={async (data) => {
          await createActivity(tenantSlug, data);
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}
