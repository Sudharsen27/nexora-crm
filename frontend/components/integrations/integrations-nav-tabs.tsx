"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Key, LayoutGrid, Plug, Store, Webhook } from "lucide-react";
import { cn } from "@/lib/utils";

interface IntegrationsNavTabsProps {
  tenantSlug: string;
}

const tabs = [
  { href: "/integrations", label: "Hub", icon: LayoutGrid, exact: true },
  { href: "/integrations/marketplace", label: "Marketplace", icon: Store },
  { href: "/integrations/installed", label: "Installed", icon: Plug },
  { href: "/integrations/webhooks", label: "Webhooks", icon: Webhook },
  { href: "/integrations/api-keys", label: "API Keys", icon: Key },
];

export function IntegrationsNavTabs({ tenantSlug }: IntegrationsNavTabsProps) {
  const pathname = usePathname();
  const base = `/${tenantSlug}`;

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Integrations sections">
      {tabs.map((tab) => {
        const href = `${base}${tab.href}`;
        const active = tab.exact
          ? pathname === href
          : pathname === href || pathname.startsWith(`${href}/`);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={href}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition-all",
              active
                ? "border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                : "border-[var(--border)]/60 bg-[var(--surface)]/60 text-[var(--muted-foreground)] backdrop-blur-sm hover:border-indigo-500/30",
            )}
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
