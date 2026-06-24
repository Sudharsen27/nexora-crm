"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  Briefcase,
  Building2,
  Contact,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Search,
  Settings,
  UserRoundPlus,
  Users,
} from "lucide-react";
import { NexoraMark } from "@/components/brand/nexora-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logoutUser } from "@/lib/api/auth";
import { clearTokens } from "@/lib/auth/tokens";
import { cn } from "@/lib/utils";

interface TenantShellProps {
  tenantSlug: string;
  tenantName: string;
  children: React.ReactNode;
}

const navItems = [
  { href: "", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: UserRoundPlus },
  { href: "/contacts", label: "Contacts", icon: Contact },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/deals", label: "Deals", icon: Briefcase },
  { href: "/activities", label: "Activities", icon: Activity },
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/settings/team", label: "Team", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function TenantShell({ tenantSlug, tenantName, children }: TenantShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/${tenantSlug}`;
  const currentSection = navItems.find((item) => {
    const href = `${base}${item.href}`;
    return pathname === href || (item.href && pathname.startsWith(href));
  })?.label;

  async function handleLogout() {
    try {
      await logoutUser();
    } catch {
      clearTokens();
    }
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col border-r border-white/10 bg-[var(--sidebar-bg)] lg:flex">
        <div className="flex h-16 items-center justify-center border-b border-white/10">
          <Link
            href={base}
            title="Nexora dashboard"
            className="inline-flex rounded-xl shadow-lg shadow-[var(--primary)]/30 transition-transform hover:scale-105"
          >
            <NexoraMark className="h-10 w-10" />
          </Link>
        </div>
        <nav className="flex-1 space-y-2 p-3">
          {navItems.map((item) => {
            const href = `${base}${item.href}`;
            const active = pathname === href || (item.href && pathname.startsWith(href));
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={href}
                title={item.label}
                className={cn(
                  "flex h-11 items-center justify-center rounded-xl transition-all duration-200",
                  active
                    ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active)] shadow-lg shadow-[var(--primary)]/30"
                    : "text-[var(--sidebar-fg)] hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="h-4 w-4" />
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <Button variant="ghost" className="h-11 w-full justify-center text-[var(--sidebar-fg)] hover:bg-white/10 hover:text-white" onClick={handleLogout} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col lg:ml-20">
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/80">
          <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center gap-3 px-4 sm:px-6">
            <Button variant="ghost" size="sm" className="lg:hidden">
              <Menu className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{currentSection ?? "Workspace"}</p>
              <p className="truncate text-xs text-[var(--muted-foreground)]">{tenantName}</p>
            </div>
            <div className="ml-auto hidden w-full max-w-sm items-center md:flex">
              <div className="relative w-full">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <Input className="pl-9" placeholder="Search leads, contacts, deals..." />
              </div>
            </div>
            <Button variant="ghost" size="sm" className="hidden md:inline-flex">
              <Bell className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
