"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  CalendarDays,
  LayoutDashboard,
  ListTodo,
  Smartphone,
  UserRoundPlus,
} from "lucide-react";
import { usePermissions } from "@/contexts/permissions-context";
import { cn } from "@/lib/utils";

const MOBILE_NAV = [
  { href: "", label: "Home", icon: LayoutDashboard, permission: "tenant:read" },
  { href: "/leads", label: "Leads", icon: UserRoundPlus, permission: "lead:read" },
  { href: "/deals", label: "Deals", icon: Briefcase, permission: "deal:read" },
  { href: "/tasks", label: "Tasks", icon: ListTodo, permission: "task:read" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, permission: "meeting:read" },
  { href: "/mobile", label: "Mobile", icon: Smartphone, permission: "mobile:read" },
];

interface MobileBottomNavProps {
  tenantSlug: string;
}

export function MobileBottomNav({ tenantSlug }: MobileBottomNavProps) {
  const pathname = usePathname();
  const base = `/${tenantSlug}`;
  const { can, loading } = usePermissions();
  const items = loading ? MOBILE_NAV : MOBILE_NAV.filter((item) => can(item.permission));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => {
          const href = `${base}${item.href}`;
          const active =
            pathname === href || (item.href !== "" && pathname.startsWith(href)) || (item.href === "" && pathname === base);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-2.5 text-[10px] font-medium transition active:scale-95",
                active
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
              )}
            >
              <Icon className={cn("h-5 w-5", active && "scale-110")} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
