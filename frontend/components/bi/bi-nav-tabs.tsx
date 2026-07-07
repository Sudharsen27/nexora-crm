"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, LineChart, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface BiNavTabsProps {
  tenantSlug: string;
}

const tabs = [
  { href: "/bi", label: "Executive", icon: LayoutDashboard, exact: true },
  { href: "/bi/dashboards", label: "Dashboards", icon: BarChart3 },
  { href: "/bi/reports", label: "Reports", icon: LineChart },
  { href: "/bi/forecast", label: "Forecast", icon: TrendingUp },
];

export function BiNavTabs({ tenantSlug }: BiNavTabsProps) {
  const pathname = usePathname();
  const base = `/${tenantSlug}`;

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Business intelligence sections">
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
                ? "border-violet-500/40 bg-violet-500/10 text-violet-700 shadow-sm dark:text-violet-300"
                : "border-[var(--border)]/60 bg-[var(--surface)]/60 text-[var(--muted-foreground)] backdrop-blur-sm hover:border-violet-500/30 hover:text-[var(--foreground)]",
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
