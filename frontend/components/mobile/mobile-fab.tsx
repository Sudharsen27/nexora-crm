"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MobileFabProps {
  tenantSlug: string;
  className?: string;
}

const QUICK_ACTIONS = [
  { href: "/leads/new", label: "New Lead" },
  { href: "/tasks", label: "New Task" },
  { href: "/deals", label: "New Deal" },
];

export function MobileFab({ tenantSlug, className }: MobileFabProps) {
  const base = `/${tenantSlug}`;

  return (
    <div className={cn("fixed bottom-20 right-4 z-30 lg:hidden", className)}>
      <div className="group relative">
        <Button
          size="lg"
          className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/40 transition active:scale-95"
          aria-label="Quick actions"
        >
          <Plus className="h-6 w-6" />
        </Button>
        <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden min-w-[140px] flex-col gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-xl group-focus-within:pointer-events-auto group-focus-within:flex group-hover:pointer-events-auto group-hover:flex">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.href}
              href={`${base}${action.href}`}
              className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
