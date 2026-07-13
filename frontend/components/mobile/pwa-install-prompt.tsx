"use client";

import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PwaInstallPromptProps {
  onInstall: () => void;
  onDismiss: () => void;
}

export function PwaInstallPrompt({ onInstall, onDismiss }: PwaInstallPromptProps) {
  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 lg:bottom-6">
      <div className="flex items-start gap-3 rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-600 to-violet-700 p-4 text-white shadow-2xl shadow-indigo-500/25">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <Download className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Install Nexora CRM</p>
          <p className="mt-0.5 text-sm text-indigo-100">
            Add to your home screen for offline access and native app experience.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="outline" className="bg-white text-indigo-700 hover:bg-indigo-50" onClick={onInstall}>
              Install App
            </Button>
            <Button size="sm" variant="ghost" className="text-indigo-100 hover:bg-white/10 hover:text-white" onClick={onDismiss}>
              Not now
            </Button>
          </div>
        </div>
        <button type="button" onClick={onDismiss} className="shrink-0 rounded-lg p-1 hover:bg-white/10" aria-label="Dismiss">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
