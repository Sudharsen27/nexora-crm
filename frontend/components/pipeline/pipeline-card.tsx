"use client";

import { useEffect, useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Calendar,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/contexts/permissions-context";
import { formatCurrency, formatStageLabel, STAGE_BADGE_COLORS } from "@/lib/api/deals";
import type { Deal } from "@/types/api";
import { cn } from "@/lib/utils";

interface PipelineCardProps {
  deal: Deal;
  onOpen: (deal: Deal) => void;
  onEdit: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
  onDuplicate: (deal: Deal) => void;
  onConvertWon: (deal: Deal) => void;
  onConvertLost: (deal: Deal) => void;
}

export function PipelineCard({
  deal,
  onOpen,
  onEdit,
  onDelete,
  onDuplicate,
  onConvertWon,
  onConvertLost,
}: PipelineCardProps) {
  const { canWrite, canDelete, loading } = usePermissions();
  const canEdit = !loading && canWrite("deal");
  const canRemove = !loading && canDelete("deal");
  const canDrag = !loading && canWrite("deal");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { type: "deal", deal },
    disabled: !canDrag,
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        isDragging && "opacity-50 ring-2 ring-[var(--primary)]/40",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className={cn(
            "min-w-0 flex-1 text-left",
            canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-default",
          )}
          onClick={() => onOpen(deal)}
          {...(canDrag ? { ...listeners, ...attributes } : {})}
        >
          <div className="flex items-center gap-2">
            <p className="truncate font-medium leading-snug text-[var(--foreground)]">{deal.title}</p>
          </div>
          <Badge
            className={cn("mt-1.5 text-[10px] font-medium", STAGE_BADGE_COLORS[deal.stage] ?? "")}
          >
            {formatStageLabel(deal.stage)}
          </Badge>
          {deal.company && (
            <p className="mt-1.5 truncate text-xs text-[var(--muted-foreground)]">
              {deal.company.company_name}
            </p>
          )}
          {deal.assigned_to && (
            <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">
              {deal.assigned_to.full_name}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {deal.value && (
              <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                {formatCurrency(deal.value, deal.currency)}
              </span>
            )}
            <span className="text-xs text-[var(--muted-foreground)]">{deal.probability}%</span>
          </div>
          {deal.expected_close_date && (
            <p className="mt-1 flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
              <Calendar className="h-3 w-3" />
              {deal.expected_close_date}
            </p>
          )}
        </button>

        <div className="relative shrink-0" ref={menuRef}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100 data-[open=true]:opacity-100"
            data-open={menuOpen}
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            aria-label="Deal actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 min-w-[10rem] rounded-xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-lg">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]"
                onClick={() => {
                  setMenuOpen(false);
                  onOpen(deal);
                }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </button>
              {canEdit && (
                <>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(deal);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--surface-muted)]"
                    onClick={() => {
                      setMenuOpen(false);
                      onDuplicate(deal);
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Duplicate
                  </button>
                  {deal.stage !== "won" && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-green-700 hover:bg-[var(--surface-muted)] dark:text-green-400"
                      onClick={() => {
                        setMenuOpen(false);
                        onConvertWon(deal);
                      }}
                    >
                      <ThumbsUp className="h-3.5 w-3.5" />
                      Convert to Won
                    </button>
                  )}
                  {deal.stage !== "lost" && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-[var(--surface-muted)] dark:text-red-400"
                      onClick={() => {
                        setMenuOpen(false);
                        onConvertLost(deal);
                      }}
                    >
                      <ThumbsDown className="h-3.5 w-3.5" />
                      Convert to Lost
                    </button>
                  )}
                </>
              )}
              {canRemove && (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-[var(--surface-muted)] dark:text-red-400"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(deal);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
