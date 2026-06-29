"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/contexts/permissions-context";
import { formatCurrency } from "@/lib/api/deals";
import type { Deal } from "@/types/api";
import { cn } from "@/lib/utils";

interface DealCardProps {
  deal: Deal;
  tenantSlug: string;
  onEdit: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
}

export function DealCard({ deal, tenantSlug, onEdit, onDelete }: DealCardProps) {
  const { canWrite, canDelete, loading } = usePermissions();
  const canEdit = !loading && canWrite("deal");
  const canRemove = !loading && canDelete("deal");
  const canDrag = !loading && canWrite("deal");

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { type: "deal", deal },
    disabled: !canDrag,
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        isDragging && "opacity-50 ring-2 ring-[var(--primary)]/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className={cn(
            "flex-1 text-left",
            canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default",
          )}
          {...(canDrag ? { ...listeners, ...attributes } : {})}
        >
          <p className="font-medium leading-snug">
            <Link
              href={`/${tenantSlug}/deals/${deal.id}`}
              className="transition-colors hover:text-[var(--primary)] hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {deal.title}
            </Link>
          </p>
          {deal.value && (
            <p className="mt-1 text-sm font-semibold text-green-700 dark:text-green-400">
              {formatCurrency(deal.value, deal.currency)}
            </p>
          )}
          {deal.assigned_to && (
            <p className="mt-1 text-xs text-zinc-500">{deal.assigned_to.full_name}</p>
          )}
        </button>
        {(canEdit || canRemove) && (
          <div className="flex shrink-0 gap-0.5">
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={() => onEdit(deal)} aria-label="Edit deal">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
            {canRemove && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(deal)}
                aria-label="Delete deal"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-600" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
