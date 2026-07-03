"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Building2,
  Contact,
  FileStack,
  ListTodo,
  CalendarDays,
  BarChart3,
  Sparkles,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CommandItem {
  id: string;
  label: string;
  group: string;
  href?: string;
  action?: () => void;
  keywords?: string[];
  icon?: React.ComponentType<{ className?: string }>;
}

interface CommandPaletteProps {
  tenantSlug: string;
  open: boolean;
  onClose: () => void;
  extraCommands?: CommandItem[];
}

const AI_COMMANDS: Omit<CommandItem, "id">[] = [
  { label: "Show my risky deals", group: "AI Commands", keywords: ["risk", "deals"], icon: Sparkles },
  { label: "Generate today's summary", group: "AI Commands", keywords: ["summary"], icon: Sparkles },
  { label: "Forecast next month's revenue", group: "AI Commands", keywords: ["forecast"], icon: Sparkles },
  { label: "Summarize meetings", group: "AI Commands", keywords: ["meetings"], icon: Sparkles },
];

export function CommandPalette({ tenantSlug, open, onClose, extraCommands = [] }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const base = `/${tenantSlug}`;

  const items: CommandItem[] = useMemo(
    () => [
      { id: "dash", label: "Dashboard", group: "Navigate", href: base, icon: BarChart3 },
      { id: "leads", label: "Leads", group: "Navigate", href: `${base}/leads`, icon: Contact },
      { id: "contacts", label: "Contacts", group: "Navigate", href: `${base}/contacts`, icon: Contact },
      { id: "companies", label: "Companies", group: "Navigate", href: `${base}/companies`, icon: Building2 },
      { id: "deals", label: "Deals", group: "Navigate", href: `${base}/deals`, icon: Briefcase },
      { id: "tasks", label: "Tasks", group: "Navigate", href: `${base}/tasks`, icon: ListTodo },
      { id: "meetings", label: "Calendar", group: "Navigate", href: `${base}/calendar`, icon: CalendarDays },
      { id: "docs", label: "Documents", group: "Navigate", href: `${base}/documents`, icon: FileStack },
      { id: "ai", label: "AI Assistant", group: "Navigate", href: `${base}/ai`, icon: Sparkles },
      ...AI_COMMANDS.map((c, i) => ({
        ...c,
        id: `ai-cmd-${i}`,
        href: `${base}/ai`,
        keywords: c.keywords,
      })),
      ...extraCommands,
    ],
    [base, extraCommands],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 12);
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        item.keywords?.some((k) => k.includes(q)),
    );
  }, [items, query]);

  const groups = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    filtered.forEach((item) => {
      const list = map.get(item.group) ?? [];
      list.push(item);
      map.set(item.group, list);
    });
    return map;
  }, [filtered]);

  const run = useCallback(
    (item: CommandItem) => {
      onClose();
      setQuery("");
      if (item.action) item.action();
      else if (item.href) router.push(item.href);
    },
    [onClose, router],
  );

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm">
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-4">
          <Search className="h-4 w-4 text-[var(--muted-foreground)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search companies, deals, AI commands…"
            className="h-12 flex-1 bg-transparent text-sm outline-none"
          />
          <kbd className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]">
            ESC
          </kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2 sidebar-scroll">
          {[...groups.entries()].map(([group, groupItems]) => (
            <div key={group} className="mb-2">
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                {group}
              </p>
              {groupItems.map((item) => {
                const Icon = item.icon ?? Search;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => run(item)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
                      "hover:bg-violet-500/10 hover:text-violet-800 dark:hover:text-violet-200",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-[var(--muted-foreground)]">No results</p>
          )}
        </div>
      </div>
      <button type="button" className="absolute inset-0 -z-10" aria-label="Close" onClick={onClose} />
    </div>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return { open, setOpen, toggle: () => setOpen((v) => !v), close: () => setOpen(false) };
}
