"use client";

import { useEffect, useState } from "react";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ActivityFormDialog } from "@/components/activities/activity-form-dialog";
import { ActivityTimeline } from "@/components/activities/activity-timeline";
import { EntityTasksPanel } from "@/components/tasks/entity-tasks-panel";
import { createActivity } from "@/lib/api/activities";
import { formatCurrency, formatStageLabel, getDeal, STAGE_BADGE_COLORS } from "@/lib/api/deals";
import type { Deal } from "@/types/api";
import { cn } from "@/lib/utils";

const TABS = ["Overview", "Notes", "Activities", "Tasks", "History"] as const;
type Tab = (typeof TABS)[number];

const HISTORY_TYPES = [
  "deal_created",
  "deal_moved",
  "deal_updated",
  "deal_deleted",
  "deal_won",
  "deal_lost",
  "deal_update",
];

interface DealDrawerProps {
  tenantSlug: string;
  dealId: string | null;
  onClose: () => void;
  onEdit?: (deal: Deal) => void;
}

export function DealDrawer({ tenantSlug, dealId, onClose, onEdit }: DealDrawerProps) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!dealId) {
      setDeal(null);
      return;
    }
    setLoading(true);
    setError(null);
    setActiveTab("Overview");
    void getDeal(tenantSlug, dealId)
      .then(setDeal)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load deal"))
      .finally(() => setLoading(false));
  }, [tenantSlug, dealId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (dealId) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dealId, onClose]);

  if (!dealId) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        role="dialog"
        aria-label="Deal details"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0 flex-1 pr-4">
            {loading ? (
              <div className="h-6 w-48 animate-pulse rounded bg-[var(--border)]" />
            ) : deal ? (
              <>
                <h2 className="truncate text-lg font-semibold">{deal.title}</h2>
                <Badge className={cn("mt-1", STAGE_BADGE_COLORS[deal.stage] ?? "")}>
                  {formatStageLabel(deal.stage)}
                </Badge>
              </>
            ) : (
              <p className="text-red-600">{error ?? "Deal not found"}</p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {deal && onEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(deal)}>
                Edit
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close drawer">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-[var(--border)] px-4">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={cn(
                "shrink-0 px-3 py-2.5 text-sm font-medium transition-colors",
                activeTab === tab
                  ? "border-b-2 border-[var(--primary)] text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
              )}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-[var(--border)]" />
              ))}
            </div>
          )}

          {!loading && deal && activeTab === "Overview" && (
            <div className="space-y-4 text-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-[var(--muted-foreground)]">Value</p>
                  <p className="font-semibold">{formatCurrency(deal.value, deal.currency)}</p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">Probability</p>
                  <p>{deal.probability}%</p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">Expected close</p>
                  <p>{deal.expected_close_date ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">Owner</p>
                  <p>{deal.assigned_to?.full_name ?? "Unassigned"}</p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">Company</p>
                  <p>{deal.company?.company_name ?? "—"}</p>
                </div>
                <div>
                  <p className="text-[var(--muted-foreground)]">Contact</p>
                  <p>
                    {deal.contact
                      ? `${deal.contact.first_name} ${deal.contact.last_name}`.trim()
                      : "—"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-[var(--muted-foreground)]">Description</p>
                <p className="mt-1 whitespace-pre-wrap">{deal.description ?? "—"}</p>
              </div>
            </div>
          )}

          {!loading && deal && activeTab === "Notes" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[var(--muted-foreground)]">Deal notes & comments</p>
                <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Add note
                </Button>
              </div>
              <ActivityTimeline
                tenantSlug={tenantSlug}
                entityType="deal"
                entityId={deal.id}
                refreshKey={refreshKey}
                filterActivityTypes={["note"]}
              />
            </div>
          )}

          {!loading && deal && activeTab === "Activities" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Activity log</p>
                <Button size="sm" onClick={() => setFormOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Log activity
                </Button>
              </div>
              <ActivityTimeline
                tenantSlug={tenantSlug}
                entityType="deal"
                entityId={deal.id}
                showDelete
                refreshKey={refreshKey}
              />
            </div>
          )}

          {!loading && deal && activeTab === "Tasks" && (
            <EntityTasksPanel tenantSlug={tenantSlug} entityType="deal" entityId={deal.id} />
          )}

          {!loading && deal && activeTab === "History" && (
            <div>
              <p className="mb-3 text-sm text-[var(--muted-foreground)]">
                Automatic audit trail for this deal
              </p>
              <ActivityTimeline
                tenantSlug={tenantSlug}
                entityType="deal"
                entityId={deal.id}
                refreshKey={refreshKey}
                filterActivityTypes={HISTORY_TYPES}
              />
            </div>
          )}
        </div>
      </aside>

      {deal && (
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
            setFormOpen(false);
          }}
        />
      )}
    </>
  );
}
