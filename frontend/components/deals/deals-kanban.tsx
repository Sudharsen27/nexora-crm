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
    return <p className="text-zinc-500">Loading pipeline...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Deals pipeline</h2>
          <p className="text-zinc-500">{board?.total ?? 0} deals · drag cards to move stages</p>
        </div>
        <Button onClick={() => openCreate("new")}>
          <Plus className="h-4 w-4" />
          New deal
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
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
            <div className="w-64 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
              <p className="font-medium">{activeDeal.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <DealFormDialog
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
