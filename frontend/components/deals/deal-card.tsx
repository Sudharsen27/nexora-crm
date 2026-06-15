"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/api/deals";
import type { Deal } from "@/types/api";
import { cn } from "@/lib/utils";

interface DealCardProps {
  deal: Deal;
  onEdit: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
}

export function DealCard({ deal, onEdit, onDelete }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { type: "deal", deal },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900",
        isDragging && "opacity-50 ring-2 ring-zinc-400",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="flex-1 cursor-grab text-left active:cursor-grabbing"
          {...listeners}
          {...attributes}
        >
          <p className="font-medium leading-snug">{deal.title}</p>
          {deal.value && (
            <p className="mt-1 text-sm font-semibold text-green-700 dark:text-green-400">
              {formatCurrency(deal.value, deal.currency)}
            </p>
          )}
          {deal.assigned_to && (
            <p className="mt-1 text-xs text-zinc-500">{deal.assigned_to.full_name}</p>
          )}
        </button>
        <div className="flex shrink-0 gap-0.5">
          <Button variant="ghost" size="sm" onClick={() => onEdit(deal)} aria-label="Edit deal">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(deal)}
            aria-label="Delete deal"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-600" />
          </Button>
        </div>
      </div>
    </div>
  );
}
