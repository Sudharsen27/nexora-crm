"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "", label: "Overview" },
  { href: "/organization", label: "Organization" },
  { href: "/security", label: "Security" },
  { href: "/audit", label: "Audit Logs" },
  { href: "/sessions", label: "Sessions" },
  { href: "/api-keys", label: "API Keys" },
  { href: "/feature-flags", label: "Features" },
  { href: "/custom-fields", label: "Custom Fields" },
  { href: "/roles", label: "Roles" },
  { href: "/identity", label: "Identity" },
];

interface AdminNavTabsProps {
  tenantSlug: string;
}

export function AdminNavTabs({ tenantSlug }: AdminNavTabsProps) {
  const pathname = usePathname();
  const base = `/${tenantSlug}/admin`;

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
                ? "bg-indigo-600 text-white shadow-sm"
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
