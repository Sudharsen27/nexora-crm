"use client";

import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export function PortalPageLoading({ label = "Loading…" }: { label?: string }) {
  return <p className="text-sm text-[var(--muted-foreground)]">{label}</p>;
}

export function PortalPageError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
      {message}
    </div>
  );
}

export function PortalEmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)]/30 px-6 py-10 text-center">
      <Icon className="mx-auto h-8 w-8 text-[var(--muted-foreground)]/60" />
      <p className="mt-3 font-medium">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
