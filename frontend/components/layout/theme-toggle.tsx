"use client";

import { useEffect, useRef, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyTheme, getStoredTheme, setStoredTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = getStoredTheme();
    setTheme(stored);
    applyTheme(stored);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function selectTheme(next: Theme) {
    setTheme(next);
    setStoredTheme(next);
    setOpen(false);
  }

  const active = OPTIONS.find((option) => option.value === theme) ?? OPTIONS[2];
  const ActiveIcon = active.icon;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-9 w-9 px-0"
        onClick={() => setOpen((value) => !value)}
        aria-label="Theme"
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={!mounted}
      >
        <ActiveIcon className="h-4 w-4" aria-hidden />
      </Button>

      {open && mounted && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-[10.5rem] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg"
        >
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const selected = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => selectTheme(option.value)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  selected
                    ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                    : "text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ThemeSelectorProps {
  className?: string;
}

export function ThemeSelector({ className }: ThemeSelectorProps) {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = getStoredTheme();
    setTheme(stored);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  function selectTheme(next: Theme) {
    setTheme(next);
    setStoredTheme(next);
  }

  return (
    <div className={cn("grid gap-2 sm:grid-cols-3", className)}>
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const selected = mounted && theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => selectTheme(option.value)}
            className={cn(
              "flex flex-col items-center gap-2 rounded-xl border px-4 py-4 text-sm transition-colors",
              selected
                ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]",
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="font-medium">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function FloatingThemeToggle() {
  return (
    <div className="fixed right-4 top-4 z-50">
      <ThemeToggle />
    </div>
  );
}
