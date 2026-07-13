"use client";

import { useEffect } from "react";
import { setOfflineAuth } from "@/lib/offline/indexed-db";
import { getAccessToken } from "@/lib/auth/tokens";
import { runFullSync } from "@/lib/offline/sync-engine";

interface OfflineSyncListenerProps {
  tenantSlug: string;
}

export function OfflineSyncListener({ tenantSlug }: OfflineSyncListenerProps) {
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      void setOfflineAuth({ tenantSlug, tokenSavedAt: new Date().toISOString() });
    }

    function onMessage(event: MessageEvent) {
      if (event.data?.type === "BACKGROUND_SYNC") {
        void runFullSync(tenantSlug).catch(() => {});
      }
    }

    navigator.serviceWorker?.addEventListener("message", onMessage);

    function onOnline() {
      if (tenantSlug) {
        void runFullSync(tenantSlug).catch(() => {});
      }
    }

    window.addEventListener("online", onOnline);

    return () => {
      navigator.serviceWorker?.removeEventListener("message", onMessage);
      window.removeEventListener("online", onOnline);
    };
  }, [tenantSlug]);

  return null;
}
