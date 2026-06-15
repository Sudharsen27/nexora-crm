"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Contact, Handshake, LogOut, Settings, Target, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logoutUser } from "@/lib/api/auth";
import { clearTokens } from "@/lib/auth/tokens";
import { cn } from "@/lib/utils";

interface TenantShellProps {
  tenantSlug: string;
  tenantName: string;
  children: React.ReactNode;
}

const navItems = [
  { href: "", label: "Dashboard", icon: Building2 },
  { href: "/leads", label: "Leads", icon: Target },
  { href: "/contacts", label: "Contacts", icon: Contact },
  { href: "/deals", label: "Deals", icon: Handshake },
  { href: "/settings/team", label: "Team", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function TenantShell({ tenantSlug, tenantName, children }: TenantShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/${tenantSlug}`;

  async function handleLogout() {
    try {
      await logoutUser();
    } catch {
      clearTokens();
    }
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <aside className="flex w-64 flex-col border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-200 p-6 dark:border-zinc-800">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Organization</p>
          <h1 className="mt-1 text-lg font-semibold">{tenantName}</h1>
        </div>
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const href = `${base}${item.href}`;
            const active = pathname === href || (item.href && pathname.startsWith(href));
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-white"
                    : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800/50",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
