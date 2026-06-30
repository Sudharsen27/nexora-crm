"use client";

import { useState } from "react";
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
import { PipelineColumn } from "@/components/pipeline/pipeline-column";
import type { Deal, DealBoard } from "@/types/api";

interface PipelineKanbanProps {
  board: DealBoard;
  canMove: boolean;
  onAdd: (stage: string) => void;
  onOpen: (deal: Deal) => void;
  onEdit: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
  onDuplicate: (deal: Deal) => void;
  onConvertWon: (deal: Deal) => void;
  onConvertLost: (deal: Deal) => void;
  onMove: (dealId: string, targetStage: string, targetPosition: number) => Promise<void>;
}

export function PipelineKanban({
  board,
  canMove,
  onAdd,
  onOpen,
  onEdit,
  onDelete,
  onDuplicate,
  onConvertWon,
  onConvertLost,
  onMove,
}: PipelineKanbanProps) {
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function findDeal(dealId: string): { deal: Deal; dealIndex: number } | null {
    for (const col of board.stages) {
      const di = col.deals.findIndex((d) => d.id === dealId);
      if (di !== -1) return { deal: col.deals[di], dealIndex: di };
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
    if (!over) return;

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
        targetPosition = col ? Math.max(0, col.deals.length - 1) : 0;
      }
    } else {
      const overFound = findDeal(overId);
      if (overFound) {
        const col = board.stages.find((s) => s.deals.some((d) => d.id === overId));
        if (col) {
          targetStage = col.slug;
          targetPosition = col.deals.findIndex((d) => d.id === overId);
        }
      }
    }

    if (targetStage === found.deal.stage && targetPosition === found.dealIndex) return;
    await onMove(activeId, targetStage, targetPosition);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div
        className="pipeline-board-scroll min-w-0 overflow-x-auto xl:overflow-x-visible"
        aria-label="Sales pipeline board"
      >
        <div className="flex w-max gap-4 xl:grid xl:w-full xl:grid-cols-6 xl:gap-3">
          {board.stages.map((column) => (
            <PipelineColumn
              key={column.slug}
              column={column}
              onAdd={onAdd}
              onOpen={onOpen}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onConvertWon={onConvertWon}
              onConvertLost={onConvertLost}
            />
          ))}
        </div>
      </div>
      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeDeal ? (
          <div className="w-[280px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xl">
            <p className="font-medium">{activeDeal.title}</p>
            {activeDeal.value && (
              <p className="mt-1 text-sm font-semibold text-green-700 dark:text-green-400">
                ${Number(activeDeal.value).toLocaleString()}
              </p>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
