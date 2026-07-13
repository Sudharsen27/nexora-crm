"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { PwaInstallPrompt } from "@/components/mobile/pwa-install-prompt";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PwaContextValue {
  isInstalled: boolean;
  canInstall: boolean;
  swReady: boolean;
  promptInstall: () => Promise<void>;
}

const PwaContext = createContext<PwaContextValue>({
  isInstalled: false,
  canInstall: false,
  swReady: false,
  promptInstall: async () => {},
});

export function usePwa() {
  return useContext(PwaContext);
}

interface PwaProviderProps {
  children: React.ReactNode;
}

export function PwaProvider({ children }: PwaProviderProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(installed);

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    }

    function onAppInstalled() {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowPrompt(false);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          setSwReady(true);
          reg.addEventListener("updatefound", () => {
            const worker = reg.installing;
            worker?.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller) {
                // New version available
              }
            });
          });
        })
        .catch(() => setSwReady(false));
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  }, [deferredPrompt]);

  return (
    <PwaContext.Provider
      value={{
        isInstalled,
        canInstall: !!deferredPrompt,
        swReady,
        promptInstall,
      }}
    >
      {children}
      {showPrompt && !isInstalled && (
        <PwaInstallPrompt onInstall={() => void promptInstall()} onDismiss={() => setShowPrompt(false)} />
      )}
    </PwaContext.Provider>
  );
}
