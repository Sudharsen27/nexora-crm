"use client";

import { useCallback, useEffect, useState } from "react";
import { registerOnlineHandlers } from "@/lib/offline/sync-engine";

export function useOnlineStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    return registerOnlineHandlers(
      () => setOnline(true),
      () => setOnline(false),
    );
  }, []);

  return online;
}
