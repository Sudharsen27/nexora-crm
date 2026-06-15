"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DealCard } from "@/components/deals/deal-card";
import { STAGE_COLORS } from "@/lib/api/deals";
import type { Deal, DealStageColumn } from "@/types/api";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  column: DealStageColumn;
  tenantSlug: string;
  onAdd: (stage: string) => void;
  onEdit: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
}

export function KanbanColumn({ column, tenantSlug, onAdd, onEdit, onDelete }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `stage:${column.slug}`,
    data: { type: "column", stage: column.slug },
  });

  const totalValue = column.deals.reduce((sum, deal) => sum + Number(deal.value ?? 0), 0);

  return (
    <div
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border border-zinc-200 bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/50",
        "border-t-4",
        STAGE_COLORS[column.slug],
        isOver && "ring-2 ring-zinc-400",
      )}
    >
      <div className="flex items-center justify-between gap-2 p-3">
        <div>
          <h3 className="font-semibold">{column.label}</h3>
          <p className="text-xs text-zinc-500">
            {column.deals.length} deal{column.deals.length !== 1 ? "s" : ""}
            {totalValue > 0 && ` · $${totalValue.toLocaleString()}`}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => onAdd(column.slug)} aria-label={`Add to ${column.label}`}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div
        ref={setNodeRef}
        className="flex min-h-[120px] flex-1 flex-col gap-2 overflow-y-auto p-2 pt-0"
      >
        <SortableContext items={column.deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {column.deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              tenantSlug={tenantSlug}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </SortableContext>
        {column.deals.length === 0 && (
          <p className="py-6 text-center text-xs text-zinc-400">Drop deals here</p>
        )}
      </div>
    </div>
  );
}
