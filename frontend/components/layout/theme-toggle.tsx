"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "nexora_theme";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    const prefersDark =
      stored === "dark" || (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
  }

  if (!mounted) {
    return (
      <Button type="button" variant="outline" size="sm" className="w-9 px-0" aria-label="Toggle theme" disabled>
        <Sun className="h-4 w-4" aria-hidden />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="w-9 px-0"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
    >
      {dark ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
    </Button>
  );
}
