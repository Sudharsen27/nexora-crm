"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DealFormDialog } from "@/components/deals/deal-form-dialog";
import { DealDrawer } from "@/components/pipeline/deal-drawer";
import { PipelineFiltersBar } from "@/components/pipeline/pipeline-filters";
import { PipelineKanban } from "@/components/pipeline/pipeline-kanban";
import { PipelineWidgets } from "@/components/pipeline/pipeline-widgets";
import { usePermissions } from "@/contexts/permissions-context";
import { useDealStatistics } from "@/hooks/use-deal-statistics";
import { usePipeline } from "@/hooks/use-pipeline";
import { createDeal, updateDeal } from "@/lib/api/deals";
import { listCompanies } from "@/lib/api/companies";
import { listMembers } from "@/lib/api/tenants";
import type { Company, Deal, DealPipelineFilters, Member } from "@/types/api";

interface PipelinePageProps {
  tenantSlug: string;
}

export function PipelinePage({ tenantSlug }: PipelinePageProps) {
  const { canWrite, loading: permsLoading } = usePermissions();
  const canCreate = !permsLoading && canWrite("deal");
  const canMove = !permsLoading && canWrite("deal");

  const [filters, setFilters] = useState<DealPipelineFilters>({});
  const [members, setMembers] = useState<Member[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [defaultStage, setDefaultStage] = useState("new");
  const [drawerDealId, setDrawerDealId] = useState<string | null>(null);

  const {
    board,
    loading,
    error,
    mutating,
    load,
    moveDealOptimistic,
    setStageOptimistic,
    removeDealOptimistic,
    duplicateDealOptimistic,
  } = usePipeline(tenantSlug, filters);

  const { stats, loading: statsLoading, error: statsError, reload: reloadStats } =
    useDealStatistics(tenantSlug);

  useEffect(() => {
    void listMembers(tenantSlug).then(setMembers);
    void listCompanies(tenantSlug, { page_size: 100 }).then((r) => setCompanies(r.items));
  }, [tenantSlug]);

  const stages = board?.stages.map((s) => ({ slug: s.slug, label: s.label })) ?? [];

  function openCreate(stage: string) {
    setEditingDeal(null);
    setDefaultStage(stage);
    setDialogOpen(true);
  }

  function openEdit(deal: Deal) {
    setEditingDeal(deal);
    setDialogOpen(true);
  }

  async function handleDelete(deal: Deal) {
    if (!confirm(`Delete deal "${deal.title}"?`)) return;
    try {
      await removeDealOptimistic(deal.id);
      if (drawerDealId === deal.id) setDrawerDealId(null);
      void reloadStats();
    } catch {
      /* error set in hook */
    }
  }

  async function handleDuplicate(deal: Deal) {
    try {
      await duplicateDealOptimistic(deal.id);
      void reloadStats();
    } catch {
      /* error set in hook */
    }
  }

  async function handleConvertWon(deal: Deal) {
    try {
      await setStageOptimistic(deal.id, "won");
      void reloadStats();
    } catch {
      /* error set in hook */
    }
  }

  async function handleConvertLost(deal: Deal) {
    try {
      await setStageOptimistic(deal.id, "lost");
      void reloadStats();
    } catch {
      /* error set in hook */
    }
  }

  async function handleMove(dealId: string, targetStage: string, targetPosition: number) {
    try {
      await moveDealOptimistic(dealId, targetStage, targetPosition);
      void reloadStats();
    } catch {
      /* error set in hook */
    }
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales Pipeline</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {board?.total ?? 0} deals
            {canMove ? " · drag cards between stages" : ""}
            {mutating ? " · saving…" : ""}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => openCreate("new")} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            New deal
          </Button>
        )}
      </div>

      <PipelineWidgets
        stats={stats}
        loading={statsLoading}
        error={statsError}
        onRetry={() => void reloadStats()}
      />

      <PipelineFiltersBar
        filters={filters}
        stages={stages}
        members={members}
        companies={companies}
        onChange={setFilters}
      />

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      {loading && !board ? (
        <div className="pipeline-board-scroll min-w-0 overflow-x-auto xl:overflow-x-visible">
          <div className="flex w-max gap-4 xl:grid xl:w-full xl:grid-cols-6 xl:gap-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="min-h-[16rem] w-[260px] shrink-0 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3 xl:w-auto xl:min-w-0"
              >
              <div className="h-5 w-24 rounded bg-[var(--border)]" />
              <div className="mt-3 space-y-2">
                {Array.from({ length: 2 }).map((_, j) => (
                  <div key={j} className="h-20 rounded-xl bg-[var(--border)]" />
                ))}
              </div>
              </div>
            ))}
          </div>
        </div>
      ) : board && board.total === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] py-16 text-center">
          <p className="text-lg font-medium">No deals in pipeline</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Create your first deal or adjust filters
          </p>
          {canCreate && (
            <Button className="mt-4" onClick={() => openCreate("new")}>
              <Plus className="h-4 w-4" />
              Create deal
            </Button>
          )}
        </div>
      ) : board ? (
        <PipelineKanban
          board={board}
          canMove={canMove}
          onAdd={openCreate}
          onOpen={(deal) => setDrawerDealId(deal.id)}
          onEdit={openEdit}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onConvertWon={handleConvertWon}
          onConvertLost={handleConvertLost}
          onMove={handleMove}
        />
      ) : null}

      <DealFormDialog
        tenantSlug={tenantSlug}
        open={dialogOpen}
        stages={stages}
        members={members}
        initial={editingDeal}
        defaultStage={defaultStage}
        onClose={() => setDialogOpen(false)}
        onSubmit={async (data) => {
          if (editingDeal) {
            await updateDeal(tenantSlug, editingDeal.id, data);
          } else {
            await createDeal(tenantSlug, data);
          }
          await load();
          void reloadStats();
        }}
      />

      <DealDrawer
        tenantSlug={tenantSlug}
        dealId={drawerDealId}
        onClose={() => setDrawerDealId(null)}
        onEdit={(deal) => {
          setDrawerDealId(null);
          openEdit(deal);
        }}
      />
    </div>
  );
}
