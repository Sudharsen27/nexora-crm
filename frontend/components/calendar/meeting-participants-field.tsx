"use client";

import Link from "next/link";
import { Bell, Search, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Member } from "@/types/api";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function roleBadgeVariant(slug: string): "default" | "secondary" | "outline" {
  if (slug === "owner") return "default";
  if (slug === "admin") return "secondary";
  return "outline";
}

interface MeetingParticipantsFieldProps {
  tenantSlug: string;
  members: Member[];
  organizerId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function MeetingParticipantsField({
  tenantSlug,
  members,
  organizerId,
  selectedIds,
  onChange,
}: MeetingParticipantsFieldProps) {
  const [query, setQuery] = useState("");

  const selectable = useMemo(
    () => members.filter((m) => m.user_id !== organizerId && m.status === "active"),
    [members, organizerId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return selectable;
    return selectable.filter(
      (m) =>
        m.full_name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.role_name.toLowerCase().includes(q),
    );
  }, [selectable, query]);

  const toggle = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onChange(selectedIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedIds, userId]);
    }
  };

  const selectAll = () => onChange(filtered.map((m) => m.user_id));
  const clearAll = () => onChange([]);

  return (
    <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] bg-[var(--surface-muted)]/40 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
              <Users className="h-4 w-4 text-[var(--primary)]" />
              Participants
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">
              Invite colleagues who should attend. They will receive an in-app notification.
            </p>
          </div>
          {selectedIds.length > 0 && (
            <Badge variant="secondary" className="shrink-0">
              {selectedIds.length} selected
            </Badge>
          )}
        </div>
      </div>

      <div className="p-4">
        {selectable.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)]/30 px-6 py-8 text-center">
            <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
              <UserPlus className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-[var(--foreground)]">No team members to invite</p>
            <p className="mt-1 max-w-xs text-xs leading-relaxed text-[var(--muted-foreground)]">
              You will get a confirmation when the meeting is saved. Add colleagues here to invite them and send them a notification too.
            </p>
            <Link href={`/${tenantSlug}/settings/team`} className="mt-4">
              <Button type="button" variant="outline" size="sm">
                Manage team
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[12rem] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="h-9 pl-9 text-sm"
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                Select all
              </Button>
              {selectedIds.length > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
                  Clear
                </Button>
              )}
            </div>

            <ul className="max-h-48 space-y-1.5 overflow-y-auto pr-0.5">
              {filtered.length === 0 ? (
                <li className="py-6 text-center text-sm text-[var(--muted-foreground)]">
                  No members match your search.
                </li>
              ) : (
                filtered.map((member) => {
                  const checked = selectedIds.includes(member.user_id);
                  return (
                    <li key={member.user_id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition",
                          checked
                            ? "border-[var(--primary)]/30 bg-[var(--primary)]/5 shadow-sm"
                            : "border-[var(--border)]/60 hover:border-[var(--border)] hover:bg-[var(--surface-muted)]/50",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(member.user_id)}
                          className="h-4 w-4 shrink-0 rounded border-[var(--border)] accent-[var(--primary)]"
                        />
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                            checked
                              ? "bg-[var(--primary)] text-white"
                              : "bg-[var(--surface-muted)] text-[var(--muted-foreground)]",
                          )}
                        >
                          {initials(member.full_name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-[var(--foreground)]">
                            {member.full_name}
                          </span>
                          <span className="block truncate text-xs text-[var(--muted-foreground)]">
                            {member.email}
                          </span>
                        </span>
                        <Badge variant={roleBadgeVariant(member.role_slug)} className="shrink-0 capitalize">
                          {member.role_name}
                        </Badge>
                      </label>
                    </li>
                  );
                })
              )}
            </ul>

            <div className="mt-3 flex items-start gap-2 rounded-lg border border-[var(--border)]/60 bg-[var(--surface-muted)]/40 px-3 py-2">
              <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--primary)]" />
              <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                Invited participants receive a notification when the meeting is scheduled, updated, or rescheduled.
              </p>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
