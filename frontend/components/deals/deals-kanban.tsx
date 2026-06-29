"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DealFormDialog } from "@/components/deals/deal-form-dialog";
import { KanbanColumn } from "@/components/deals/kanban-column";
import { usePermissions } from "@/contexts/permissions-context";
import {
  createDeal,
  deleteDeal,
  getDealBoard,
  moveDeal,
  updateDeal,
} from "@/lib/api/deals";
import { listMembers } from "@/lib/api/tenants";
import type { Deal, DealBoard, DealStageMeta, Member } from "@/types/api";

interface DealsKanbanProps {
  tenantSlug: string;
}

export function DealsKanban({ tenantSlug }: DealsKanbanProps) {
  const { canWrite, loading: permsLoading } = usePermissions();
  const canCreate = !permsLoading && canWrite("deal");
  const canMove = !permsLoading && canWrite("deal");
  const [board, setBoard] = useState<DealBoard | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [defaultStage, setDefaultStage] = useState("new");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const stages: DealStageMeta[] =
    board?.stages.map((s) => ({ slug: s.slug, label: s.label })) ?? [];

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDealBoard(tenantSlug);
      setBoard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load deals");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    void loadBoard();
    void listMembers(tenantSlug).then(setMembers);
  }, [loadBoard, tenantSlug]);

  function findDeal(dealId: string): { deal: Deal; stageIndex: number; dealIndex: number } | null {
    if (!board) return null;
    for (let si = 0; si < board.stages.length; si++) {
      const di = board.stages[si].deals.findIndex((d) => d.id === dealId);
      if (di !== -1) return { deal: board.stages[si].deals[di], stageIndex: si, dealIndex: di };
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    const found = findDeal(String(event.active.id));
    if (found) setActiveDeal(found.deal);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDeal(null);
    if (!canMove) return;
    const { active, over } = event;
    if (!over || !board) return;

    const activeId = String(active.id);
    const found = findDeal(activeId);
    if (!found) return;

    let targetStage = found.deal.stage;
    let targetPosition = found.dealIndex;

    const overId = String(over.id);
    if (overId.startsWith("stage:")) {
      targetStage = overId.replace("stage:", "");
      const col = board.stages.find((s) => s.slug === targetStage);
      targetPosition = col ? col.deals.length : 0;
      if (targetStage === found.deal.stage) {
        targetPosition = col ? col.deals.length - 1 : 0;
      }
    } else {
      const overFound = findDeal(overId);
      if (overFound) {
        targetStage = overFound.deal.stage;
        targetPosition = overFound.dealIndex;
      }
    }

    if (targetStage === found.deal.stage && targetPosition === found.dealIndex) return;

    try {
      await moveDeal(tenantSlug, activeId, { stage: targetStage, position: targetPosition });
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move deal");
    }
  }

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
      await deleteDeal(tenantSlug, deal.id);
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete deal");
    }
  }

  if (loading && !board) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="min-h-[12rem] w-full animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-3"
          >
            <div className="h-5 w-24 rounded bg-[var(--border)]" />
            <div className="mt-2 h-4 w-20 rounded bg-[var(--border)]" />
            <div className="mt-3 space-y-2">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="h-16 rounded-xl bg-[var(--border)]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Deals pipeline</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {board?.total ?? 0} deals
            {canMove ? " · drag cards to move stages" : ""}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => openCreate("new")} className="w-full shrink-0 sm:w-auto">
            <Plus className="h-4 w-4" />
            New deal
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6"
          aria-label="Deal pipeline board"
        >
          {board?.stages.map((column) => (
            <KanbanColumn
              key={column.slug}
              column={column}
              tenantSlug={tenantSlug}
              onAdd={openCreate}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
        <DragOverlay>
          {activeDeal ? (
            <div className="w-full max-w-sm rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg">
              <p className="font-medium text-[var(--foreground)]">{activeDeal.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

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
          await loadBoard();
        }}
      />
    </div>
  );
}
