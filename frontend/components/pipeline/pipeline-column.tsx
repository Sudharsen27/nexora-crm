"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/contexts/permissions-context";
import { PipelineCard } from "@/components/pipeline/pipeline-card";
import { STAGE_COLORS } from "@/lib/api/deals";
import type { Deal, DealStageColumn } from "@/types/api";
import { cn } from "@/lib/utils";

interface PipelineColumnProps {
  column: DealStageColumn;
  onAdd: (stage: string) => void;
  onOpen: (deal: Deal) => void;
  onEdit: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
  onDuplicate: (deal: Deal) => void;
  onConvertWon: (deal: Deal) => void;
  onConvertLost: (deal: Deal) => void;
}

export function PipelineColumn({
  column,
  onAdd,
  onOpen,
  onEdit,
  onDelete,
  onDuplicate,
  onConvertWon,
  onConvertLost,
}: PipelineColumnProps) {
  const { canWrite, loading } = usePermissions();
  const canAdd = !loading && canWrite("deal");
  const { setNodeRef, isOver } = useDroppable({
    id: `stage:${column.slug}`,
    data: { type: "column", stage: column.slug },
  });

  const totalValue = column.deals.reduce((sum, deal) => sum + Number(deal.value ?? 0), 0);

  return (
    <div
        className={cn(
        "flex w-[260px] shrink-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]",
        "min-h-[16rem] xl:w-auto xl:min-w-0 xl:shrink",
        "lg:max-h-[min(65vh,680px)]",
        "border-t-4",
        STAGE_COLORS[column.slug],
        isOver && "ring-2 ring-[var(--primary)]/40",
      )}
    >
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{column.label}</h3>
          <p className="text-xs text-[var(--muted-foreground)]">
            {column.deals.length} deal{column.deals.length !== 1 ? "s" : ""}
            {totalValue > 0 && ` · $${totalValue.toLocaleString()}`}
          </p>
        </div>
        {canAdd && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAdd(column.slug)}
            aria-label={`Add to ${column.label}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div
        ref={setNodeRef}
        className="kanban-column-scroll flex min-h-[6rem] flex-1 flex-col gap-2 overflow-y-auto p-2 pt-0"
      >
        <SortableContext items={column.deals.map((d) => d.id)} strategy={verticalListSortingStrategy}>
          {column.deals.map((deal) => (
            <PipelineCard
              key={deal.id}
              deal={deal}
              onOpen={onOpen}
              onEdit={onEdit}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onConvertWon={onConvertWon}
              onConvertLost={onConvertLost}
            />
          ))}
        </SortableContext>
        {column.deals.length === 0 && (
          <p className="py-8 text-center text-xs text-[var(--muted-foreground)]">Drop deals here</p>
        )}
      </div>
    </div>
  );
}
