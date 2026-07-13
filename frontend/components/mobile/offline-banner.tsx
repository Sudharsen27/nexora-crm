"use client";

import { CloudOff, RefreshCw, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { cn } from "@/lib/utils";

interface OfflineBannerProps {
  tenantSlug: string;
  onSync?: () => void;
  syncing?: boolean;
  className?: string;
}

export function OfflineBanner({ onSync, syncing, className }: OfflineBannerProps) {
  const online = useOnlineStatus();

  if (online) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300",
          className,
        )}
      >
        <Wifi className="h-4 w-4 shrink-0" />
        <span>Online — data syncs automatically</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <CloudOff className="h-4 w-4 shrink-0" />
        <span>Offline mode — viewing cached data</span>
      </div>
      {onSync && (
        <Button size="sm" variant="outline" className="h-7 shrink-0" onClick={onSync} disabled={syncing}>
          <RefreshCw className={cn("mr-1 h-3 w-3", syncing && "animate-spin")} />
          Sync
        </Button>
      )}
    </div>
  );
}
