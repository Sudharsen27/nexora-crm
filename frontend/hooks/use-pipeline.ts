"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deleteDeal,
  duplicateDeal,
  getDealPipeline,
  moveDeal,
} from "@/lib/api/deals";
import type { Deal, DealBoard, DealPipelineFilters } from "@/types/api";

function cloneBoard(board: DealBoard): DealBoard {
  return {
    total: board.total,
    stages: board.stages.map((col) => ({
      ...col,
      deals: [...col.deals],
    })),
  };
}

function findDealInBoard(
  board: DealBoard,
  dealId: string,
): { deal: Deal; stageIndex: number; dealIndex: number } | null {
  for (let si = 0; si < board.stages.length; si++) {
    const di = board.stages[si].deals.findIndex((d) => d.id === dealId);
    if (di !== -1) return { deal: board.stages[si].deals[di], stageIndex: si, dealIndex: di };
  }
  return null;
}

/** Optimistically move a deal within local board state. */
export function optimisticMoveDeal(
  board: DealBoard,
  dealId: string,
  targetStage: string,
  targetPosition: number,
): DealBoard {
  const next = cloneBoard(board);
  const found = findDealInBoard(next, dealId);
  if (!found) return board;

  const [removed] = next.stages[found.stageIndex].deals.splice(found.dealIndex, 1);
  const targetCol = next.stages.find((s) => s.slug === targetStage);
  if (!targetCol) return board;

  const updated: Deal = { ...removed, stage: targetStage, position: targetPosition };
  targetCol.deals.splice(Math.min(targetPosition, targetCol.deals.length), 0, updated);

  next.stages.forEach((col) => {
    col.deals.forEach((d, i) => {
      d.position = i;
    });
  });
  next.total = next.stages.reduce((sum, col) => sum + col.deals.length, 0);
  return next;
}

export function usePipeline(tenantSlug: string, filters: DealPipelineFilters = {}) {
  const [board, setBoard] = useState<DealBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mutating, setMutating] = useState(false);

  const filterKey = JSON.stringify(filters);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDealPipeline(tenantSlug, filters);
      setBoard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, filterKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const moveDealOptimistic = useCallback(
    async (dealId: string, targetStage: string, targetPosition: number) => {
      if (!board) return;
      const previous = board;
      setBoard(optimisticMoveDeal(board, dealId, targetStage, targetPosition));
      setMutating(true);
      setError(null);
      try {
        await moveDeal(tenantSlug, dealId, { stage: targetStage, position: targetPosition });
      } catch (err) {
        setBoard(previous);
        setError(err instanceof Error ? err.message : "Failed to move deal");
        throw err;
      } finally {
        setMutating(false);
      }
    },
    [board, tenantSlug],
  );

  const setStageOptimistic = useCallback(
    async (dealId: string, stage: string) => {
      if (!board) return;
      const found = findDealInBoard(board, dealId);
      if (!found) return;
      const targetCol = board.stages.find((s) => s.slug === stage);
      const targetPosition = targetCol ? targetCol.deals.length : 0;
      await moveDealOptimistic(dealId, stage, targetPosition);
    },
    [board, moveDealOptimistic],
  );

  const removeDealOptimistic = useCallback(
    async (dealId: string) => {
      if (!board) return;
      const previous = board;
      const next = cloneBoard(board);
      for (const col of next.stages) {
        const idx = col.deals.findIndex((d) => d.id === dealId);
        if (idx !== -1) {
          col.deals.splice(idx, 1);
          break;
        }
      }
      next.total = next.stages.reduce((sum, col) => sum + col.deals.length, 0);
      setBoard(next);
      setMutating(true);
      try {
        await deleteDeal(tenantSlug, dealId);
      } catch (err) {
        setBoard(previous);
        setError(err instanceof Error ? err.message : "Failed to delete deal");
        throw err;
      } finally {
        setMutating(false);
      }
    },
    [board, tenantSlug],
  );

  const duplicateDealOptimistic = useCallback(
    async (dealId: string) => {
      setMutating(true);
      try {
        await duplicateDeal(tenantSlug, dealId);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to duplicate deal");
        throw err;
      } finally {
        setMutating(false);
      }
    },
    [tenantSlug, load],
  );

  return {
    board,
    loading,
    error,
    mutating,
    load,
    setError,
    moveDealOptimistic,
    setStageOptimistic,
    removeDealOptimistic,
    duplicateDealOptimistic,
    findDeal: (dealId: string) => (board ? findDealInBoard(board, dealId) : null),
  };
}
