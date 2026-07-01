"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Archive,
  Clock,
  FileText,
  Inbox,
  Send,
  Star,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FOLDER_LABELS } from "@/lib/api/emails";

interface EmailSidebarProps {
  tenantSlug: string;
  stats?: {
    unread_count?: number;
    drafts_count?: number;
    scheduled_count?: number;
  };
}

const NAV = [
  { folder: "inbox", icon: Inbox, countKey: "unread_count" as const },
  { folder: "sent", icon: Send },
  { folder: "drafts", icon: FileText, countKey: "drafts_count" as const },
  { folder: "scheduled", icon: Clock, countKey: "scheduled_count" as const },
  { folder: "starred", icon: Star },
  { folder: "archive", icon: Archive },
  { folder: "trash", icon: Trash2 },
];

export function EmailSidebar({ tenantSlug, stats }: EmailSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeFolder = searchParams.get("folder") ?? "sent";
  const isTemplates = pathname.endsWith("/templates");

  return (
    <nav className="flex flex-col gap-1">
      <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Folders</p>
      {NAV.map(({ folder, icon: Icon, countKey }) => {
        const active = !isTemplates && activeFolder === folder;
        const count = countKey && stats ? stats[countKey] : undefined;
        const href = `/${tenantSlug}/emails?folder=${folder}`;
        return (
          <Link
            key={folder}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
              active
                ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{FOLDER_LABELS[folder]}</span>
            {count != null && count > 0 && (
              <span className="rounded-full bg-[var(--primary)]/15 px-2 py-0.5 text-xs font-semibold text-[var(--primary)]">
                {count}
              </span>
            )}
          </Link>
        );
      })}
      <div className="my-2 border-t border-[var(--border)]" />
      <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Tools</p>
      <Link
        href={`/${tenantSlug}/emails/templates`}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
          isTemplates
            ? "bg-[var(--primary)]/10 text-[var(--primary)]"
            : "text-[var(--muted-foreground)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]",
        )}
      >
        <FileText className="h-4 w-4" />
        Templates
      </Link>
    </nav>
  );
}
