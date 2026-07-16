"use client";

import { Check, Download, MonitorSmartphone, WifiOff, X, Zap } from "lucide-react";
import { NexoraMark } from "@/components/brand/nexora-mark";
import { Button } from "@/components/ui/button";

interface PwaInstallPromptProps {
  onInstall: () => void;
  onDismiss: () => void;
}

const BENEFITS = [
  { icon: Zap, label: "Launch instantly from your desktop or home screen" },
  { icon: WifiOff, label: "Keep working offline with synced CRM data" },
  { icon: MonitorSmartphone, label: "Native-feel app without an app store" },
];

export function PwaInstallPrompt({ onInstall, onDismiss }: PwaInstallPromptProps) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-6 sm:justify-end sm:p-6 lg:bottom-8"
      role="dialog"
      aria-labelledby="pwa-install-title"
      aria-describedby="pwa-install-desc"
    >
      <div className="pointer-events-auto w-full max-w-[380px] animate-in fade-in-0 slide-in-from-bottom-5 duration-300">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_24px_64px_-16px_rgba(15,23,42,0.35)]">
          {/* Accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-teal-600 via-cyan-600 to-slate-800" />

          <button
            type="button"
            onClick={onDismiss}
            className="absolute right-3 top-4 rounded-lg p-1.5 text-[var(--muted-foreground)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="p-5 pt-4">
            <div className="flex items-start gap-3 pr-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]">
                <NexoraMark className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-400">
                  Install app
                </p>
                <h2 id="pwa-install-title" className="mt-0.5 text-base font-semibold tracking-tight text-[var(--foreground)]">
                  Get Nexora on this device
                </h2>
                <p id="pwa-install-desc" className="mt-1 text-sm leading-relaxed text-[var(--muted-foreground)]">
                  Install once for a faster, fullscreen CRM experience — same account, offline-ready.
                </p>
              </div>
            </div>

            <ul className="mt-4 space-y-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/70 p-3">
              {BENEFITS.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-start gap-2.5 text-sm text-[var(--foreground)]">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-600/10 text-teal-700 dark:text-teal-400">
                    <Icon className="h-3 w-3" />
                  </span>
                  <span className="leading-snug text-[var(--muted-foreground)]">{label}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                variant="ghost"
                className="h-10 flex-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                onClick={onDismiss}
              >
                Not now
              </Button>
              <Button
                type="button"
                className="h-10 flex-1 gap-2 bg-slate-900 text-white hover:bg-slate-800 dark:bg-teal-600 dark:hover:bg-teal-500"
                onClick={onInstall}
              >
                <Download className="h-4 w-4" />
                Install Nexora
              </Button>
            </div>

            <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[var(--muted-foreground)]">
              <Check className="h-3 w-3 text-teal-600" />
              No app store · Uses ~2 MB · Updates automatically
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
