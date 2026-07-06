"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BookOpen,
  Calendar,
  FileText,
  Handshake,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Receipt,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { NexoraMark } from "@/components/brand/nexora-mark";
import { buttonVariants } from "@/components/ui/button-variants";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { getPortalNotifications, portalLogout } from "@/lib/api/portal";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "", label: "Dashboard", icon: LayoutDashboard },
  { href: "/deals", label: "Deals", icon: Handshake },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/support", label: "Support", icon: HelpCircle },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/ai", label: "AI Assistant", icon: Sparkles },
  { href: "/profile", label: "Profile", icon: User },
];

const MOBILE_PRIMARY = NAV.slice(0, 4);

interface PortalShellProps {
  tenantSlug: string;
  tenantName: string;
  children: React.ReactNode;
}

export function PortalShell({ tenantSlug, tenantName, children }: PortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const base = `/portal/${tenantSlug}`;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    void getPortalNotifications(tenantSlug)
      .then((items) => setUnreadCount(items.filter((n) => !n.is_read).length))
      .catch(() => setUnreadCount(0));
  }, [tenantSlug, pathname]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  function isActive(href: string) {
    return href === "" ? pathname === base : pathname.startsWith(`${base}${href}`);
  }

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] lg:flex lg:flex-col">
        <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-4">
          <NexoraMark className="h-8 w-8" />
          <div>
            <p className="text-sm font-bold">Customer Portal</p>
            <p className="text-xs text-[var(--muted-foreground)]">{tenantName}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((item) => {
            const href = `${base}${item.href}`;
            const active = isActive(item.href);
            const Icon = item.icon;
            const showBadge = item.href === "/notifications" && unreadCount > 0;
            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {showBadge && (
                  <span className="rounded-full bg-sky-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--border)] p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            onClick={() => {
              portalLogout();
              router.push("/portal/login");
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/80 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-2 lg:hidden">
            <NexoraMark className="h-7 w-7" />
            <div>
              <p className="text-sm font-semibold">{tenantName}</p>
              <p className="text-xs text-[var(--muted-foreground)]">Customer Portal</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href={`${base}/notifications`}
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "relative lg:hidden")}
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-600 px-1 text-[9px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <ThemeToggle />
            <Link
              href={`${base}/support`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "hidden sm:inline-flex lg:hidden")}
            >
              <MessageSquare className="h-4 w-4" />
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 pb-28 sm:p-6 lg:pb-6">{children}</main>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Menu</p>
              <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="grid grid-cols-2 gap-2">
              {NAV.map((item) => {
                const href = `${base}${item.href}`;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={href}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium",
                      isActive(item.href)
                        ? "border-sky-500/30 bg-sky-500/10 text-sky-700"
                        : "border-[var(--border)]",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[var(--border)] bg-[var(--surface)]/95 px-1 py-1 backdrop-blur-xl lg:hidden">
        {MOBILE_PRIMARY.map((item) => {
          const href = `${base}${item.href}`;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium",
                isActive(item.href) ? "text-sky-700" : "text-[var(--muted-foreground)]",
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className={cn(
            "flex flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-2 text-[10px] font-medium",
            mobileMenuOpen ? "text-sky-700" : "text-[var(--muted-foreground)]",
          )}
        >
          <Menu className="h-4 w-4" />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
