"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function PullToRefresh({ onRefresh, children, className, disabled }: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const pullDistance = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || window.scrollY > 0) return;
    startY.current = e.touches[0].clientY;
  }, [disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || startY.current === 0) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0 && window.scrollY === 0) {
      pullDistance.current = Math.min(delta, 120);
      setPulling(pullDistance.current > 60);
    }
  }, [disabled]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled) return;
    if (pulling && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    startY.current = 0;
    pullDistance.current = 0;
    setPulling(false);
  }, [disabled, pulling, refreshing, onRefresh]);

  return (
    <div
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => void handleTouchEnd()}
    >
      {(pulling || refreshing) && (
        <div className="absolute inset-x-0 top-0 z-10 flex justify-center py-2">
          <div
            className={cn(
              "h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent",
              refreshing && "animate-spin",
            )}
          />
        </div>
      )}
      {children}
    </div>
  );
}
