"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Briefcase,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Contact,
  GitBranch,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Mail,
  Menu,
  Search,
  Settings,
  UserRoundPlus,
  Users,
  Workflow,
  FileStack,
  Sparkles,
  X,
} from "lucide-react";
import { CommandPalette, useCommandPalette } from "@/components/ai/command-palette";
import { FloatingAiAssistant } from "@/components/ai/floating-ai-assistant";
import { NexoraLogo } from "@/components/brand/nexora-logo";
import { NexoraMark } from "@/components/brand/nexora-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { PermissionsProvider, usePermissions } from "@/contexts/permissions-context";
import { NotificationProvider } from "@/contexts/notification-context";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { NotificationToastStack } from "@/components/notifications/notification-toast-stack";
import { TenantSubtitle } from "@/components/layout/role-badge";
import { logoutUser } from "@/lib/api/auth";
import { clearTokens } from "@/lib/auth/tokens";
import { cn } from "@/lib/utils";

interface TenantShellProps {
  tenantSlug: string;
  tenantName: string;
  children: React.ReactNode;
}

const navItems = [
  { href: "", label: "Dashboard", icon: LayoutDashboard, permission: "tenant:read" },
  { href: "/ai", label: "AI Assistant", icon: Sparkles, permission: "tenant:read", featured: true },
  { href: "/leads", label: "Leads", icon: UserRoundPlus, permission: "lead:read" },
  { href: "/contacts", label: "Contacts", icon: Contact, permission: "contact:read" },
  { href: "/companies", label: "Companies", icon: Building2, permission: "company:read" },
  { href: "/deals", label: "Deals", icon: Briefcase, permission: "deal:read" },
  { href: "/pipeline", label: "Pipeline", icon: GitBranch, permission: "deal:read" },
  { href: "/activities", label: "Activities", icon: Activity, permission: "activity:read" },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, permission: "meeting:read" },
  { href: "/emails", label: "Email", icon: Mail, permission: "email:read" },
  { href: "/tasks", label: "Tasks", icon: ListTodo, permission: "task:read" },
  { href: "/workflows", label: "Workflows", icon: Workflow, permission: "workflow:read" },
  { href: "/documents", label: "Documents", icon: FileStack, permission: "document:read" },
  { href: "/settings/team", label: "Team", icon: Users, permission: "user:read" },
  { href: "/settings", label: "Settings", icon: Settings, permission: "settings:read" },
];

const SIDEBAR_STORAGE_KEY = "nexora_sidebar_expanded";

interface SidebarNavProps {
  base: string;
  pathname: string;
  expanded: boolean;
  onNavigate?: () => void;
  showClose?: boolean;
  onClose?: () => void;
}

function SidebarLabel({ expanded, children }: { expanded: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "truncate text-sm font-medium whitespace-nowrap transition-[opacity,width,margin] duration-300 ease-in-out",
        expanded ? "ml-3 w-auto opacity-100" : "ml-0 w-0 overflow-hidden opacity-0",
      )}
    >
      {children}
    </span>
  );
}

function SidebarNav({ base, pathname, expanded, onNavigate, showClose = false, onClose }: SidebarNavProps) {
  const router = useRouter();
  const { can, loading } = usePermissions();
  const visibleNavItems = loading ? navItems : navItems.filter((item) => can(item.permission));

  async function handleLogout() {
    try {
      await logoutUser();
    } catch {
      clearTokens();
    }
    router.push("/login");
  }

  return (
    <>
      <div
        className={cn(
          "flex h-16 shrink-0 items-center overflow-hidden border-b border-white/10",
          expanded ? "justify-between px-4" : "justify-center px-2",
        )}
      >
        <Link
          href={base}
          title="Nexora dashboard"
          onClick={onNavigate}
          className={cn(
            "inline-flex min-w-0 items-center overflow-hidden rounded-xl transition-transform hover:scale-[1.02]",
            expanded ? "gap-3" : "justify-center",
          )}
        >
          {expanded ? (
            <NexoraLogo imageClassName="h-11 w-auto" />
          ) : (
            <NexoraMark className="h-10 w-10 shrink-0" />
          )}
        </Link>
        {showClose && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 shrink-0 text-[var(--sidebar-fg)] hover:bg-white/10 hover:text-white"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <nav className="sidebar-scroll flex-1 space-y-1 p-3">
        {visibleNavItems.map((item) => {
          const href = `${base}${item.href}`;
          const active = pathname === href || (item.href && pathname.startsWith(href));
          const Icon = item.icon;
          const featured = "featured" in item && item.featured;
          return (
            <Link
              key={item.label}
              href={href}
              title={!expanded ? item.label : undefined}
              onClick={onNavigate}
              className={cn(
                "flex h-11 min-w-0 items-center overflow-hidden rounded-xl transition-colors duration-200",
                expanded ? "px-3" : "justify-center px-0",
                active
                  ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active)] shadow-lg shadow-[var(--primary)]/30"
                  : featured
                    ? "bg-gradient-to-r from-violet-600/20 to-indigo-600/20 text-violet-200 hover:from-violet-600/30 hover:to-indigo-600/30"
                    : "text-[var(--sidebar-fg)] hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <SidebarLabel expanded={expanded}>{item.label}</SidebarLabel>
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-3">
        <Button
          variant="ghost"
          className={cn(
            "text-[var(--sidebar-fg)] hover:bg-white/10 hover:text-white",
            expanded ? "h-11 w-full justify-start px-3" : "mx-auto h-11 w-11 justify-center p-0",
          )}
          onClick={() => void handleLogout()}
          title="Sign out"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <SidebarLabel expanded={expanded}>Sign out</SidebarLabel>
        </Button>
      </div>
    </>
  );
}

export function TenantShell({ tenantSlug, tenantName, children }: TenantShellProps) {
  const pathname = usePathname();
  const base = `/${tenantSlug}`;
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const commandPalette = useCommandPalette();

  const currentSection = navItems.find((item) => {
    const href = `${base}${item.href}`;
    return pathname === href || (item.href && pathname.startsWith(href));
  })?.label;

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (stored !== null) {
      setSidebarExpanded(stored === "true");
    }
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileNavOpen(false);
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileNavOpen]);

  function toggleSidebar() {
    setSidebarExpanded((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      return next;
    });
  }

  return (
    <PermissionsProvider tenantSlug={tenantSlug}>
      <NotificationProvider tenantSlug={tenantSlug}>
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col overflow-hidden border-r border-white/10 bg-[var(--sidebar-bg)] transition-[width] duration-300 ease-in-out lg:flex",
          sidebarExpanded ? "w-64" : "w-[4.5rem]",
        )}
      >
        <SidebarNav base={base} pathname={pathname} expanded={sidebarExpanded} />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative z-50 flex h-full w-72 max-w-[85vw] flex-col overflow-hidden border-r border-white/10 bg-[var(--sidebar-bg)] shadow-2xl">
            <SidebarNav
              base={base}
              pathname={pathname}
              expanded
              onNavigate={() => setMobileNavOpen(false)}
              showClose
              onClose={() => setMobileNavOpen(false)}
            />
          </aside>
        </div>
      )}

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col transition-[margin] duration-300 ease-in-out",
          sidebarExpanded ? "lg:ml-64" : "lg:ml-[4.5rem]",
        )}
      >
        <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/80">
          <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center gap-3 px-4 sm:px-6">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hidden lg:inline-flex"
              onClick={toggleSidebar}
              aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
              title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{currentSection ?? "Workspace"}</p>
              <TenantSubtitle tenantName={tenantName} />
            </div>
            <div className="ml-auto hidden w-full max-w-sm items-center md:flex">
              <button
                type="button"
                onClick={commandPalette.toggle}
                className="relative w-full text-left"
              >
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <Input
                  className="pointer-events-none pl-9"
                  placeholder="Search or press Ctrl+K…"
                  readOnly
                />
              </button>
            </div>
            <ThemeToggle />
            <NotificationBell tenantSlug={tenantSlug} />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
      </div>
      <NotificationToastStack />
      <CommandPalette
        tenantSlug={tenantSlug}
        open={commandPalette.open}
        onClose={commandPalette.close}
      />
      <FloatingAiAssistant tenantSlug={tenantSlug} />
      </NotificationProvider>
    </PermissionsProvider>
  );
}
