"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "", label: "Overview" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/installed", label: "Installed" },
  { href: "/webhooks", label: "Webhooks" },
  { href: "/api-explorer", label: "API Explorer" },
  { href: "/graphql", label: "GraphQL" },
  { href: "/sdk", label: "SDK" },
  { href: "/cli", label: "CLI" },
  { href: "/docs", label: "Docs" },
];

interface DevelopersNavTabsProps {
  tenantSlug: string;
}

export function DevelopersNavTabs({ tenantSlug }: DevelopersNavTabsProps) {
  const pathname = usePathname();
  const base = `/${tenantSlug}/developers`;

  return (
    <div className="flex gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
      {TABS.map((tab) => {
        const href = `${base}${tab.href}`;
        const active = tab.href === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={tab.href}
            href={href}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition",
              active
                ? "bg-teal-600 text-white shadow-sm"
                : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
