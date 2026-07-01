"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PenSquare, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmailComposeDialog } from "@/components/emails/email-compose-dialog";
import { EmailDetailDrawer } from "@/components/emails/email-detail-drawer";
import { EmailDetailView } from "@/components/emails/email-detail-view";
import { EmailList } from "@/components/emails/email-list";
import { EmailSidebar } from "@/components/emails/email-sidebar";
import { WidgetError } from "@/components/dashboard/widget-states";
import { usePermissions } from "@/contexts/permissions-context";
import { useEmailStatistics, useEmails } from "@/hooks/use-emails";
import { FOLDER_LABELS, markEmailRead } from "@/lib/api/emails";
import type { EmailFolder } from "@/types/email";

interface EmailsPageProps {
  tenantSlug: string;
}

export function EmailsPage({ tenantSlug }: EmailsPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canRead, canWrite } = usePermissions();

  const folder = (searchParams.get("folder") ?? "inbox") as EmailFolder;
  const q = searchParams.get("q") ?? "";
  const selectedId = searchParams.get("id");
  const page = Number(searchParams.get("page") ?? "1");
  const unread = searchParams.get("unread") === "1";
  const starred = searchParams.get("starred") === "1";
  const important = searchParams.get("important") === "1";
  const hasAttachments = searchParams.get("attachments") === "1";
  const hasActiveFilters = unread || starred || important || hasAttachments || Boolean(q);

  const [searchInput, setSearchInput] = useState(q);
  const [composeOpen, setComposeOpen] = useState(false);

  const filters = {
    folder,
    q: q || undefined,
    unread: unread || undefined,
    starred: starred || undefined,
    important: important || undefined,
    has_attachments: hasAttachments || undefined,
    page,
    page_size: 30,
  };

  const { items, total, pages, loading, error, refresh } = useEmails(tenantSlug, filters);
  const { stats, refresh: refreshStats } = useEmailStatistics(tenantSlug);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      });
      router.push(`/${tenantSlug}/emails?${params.toString()}`);
    },
    [router, searchParams, tenantSlug],
  );

  const handleSelect = async (id: string) => {
    updateParams({ id });
    try {
      await markEmailRead(tenantSlug, id, true);
      void refresh();
    } catch {
      /* silent */
    }
  };

  const handleRefresh = () => {
    void refresh();
    void refreshStats();
  };

  const clearFilters = () => {
    setSearchInput("");
    updateParams({ q: null, unread: null, starred: null, important: null, attachments: null, page: "1" });
  };

  if (!canRead("email")) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-14 text-center">
        <p className="text-base font-medium text-[var(--foreground)]">Access restricted</p>
        <p className="mt-1 text-sm text-zinc-500">You do not have permission to view emails.</p>
      </div>
    );
  }

  const selected = items.find((e) => e.id === selectedId) ?? null;
  const folderLabel = FOLDER_LABELS[folder] ?? folder;
  const subtitleParts = [
    `${total} in ${folderLabel.toLowerCase()}`,
    stats?.unread_count ? `${stats.unread_count} unread` : null,
    stats?.sent_today ? `${stats.sent_today} sent today` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Email Center</h2>
          <p className="mt-1 text-sm text-zinc-500">{subtitleParts.join(" · ")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={handleRefresh} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {canWrite("email") && (
            <Button type="button" onClick={() => setComposeOpen(true)}>
              <PenSquare className="h-4 w-4" />
              Compose
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr] xl:grid-cols-[260px_380px_1fr]">
        <aside className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]/80 p-3 backdrop-blur">
          <EmailSidebar tenantSlug={tenantSlug} stats={stats ?? undefined} />
        </aside>

        <section className="flex min-h-[520px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm xl:col-span-1">
          <div className="border-b border-[var(--border)] p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[var(--foreground)]">{folderLabel}</p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-medium text-[var(--primary)] hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && updateParams({ q: searchInput, page: "1" })}
                placeholder="Search subject, body, or recipients..."
                className="pl-9"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { key: "unread", label: "Unread" },
                { key: "starred", label: "Starred" },
                { key: "important", label: "Important" },
                { key: "attachments", label: "Attachments" },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => updateParams({ [f.key]: searchParams.get(f.key) === "1" ? null : "1", page: "1" })}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                    searchParams.get(f.key) === "1"
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--surface-muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {error ? (
            <WidgetError title="Emails unavailable" message={error} onRetry={handleRefresh} />
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <EmailList
                  emails={items}
                  selectedId={selectedId}
                  folder={folder}
                  onSelect={handleSelect}
                  loading={loading}
                  onCompose={canWrite("email") ? () => setComposeOpen(true) : undefined}
                />
              </div>
              {pages > 1 && (
                <div className="flex flex-col items-start justify-between gap-3 border-t border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center">
                  <p className="text-sm text-zinc-500">
                    Page {page} of {pages} · {total} total
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || loading}
                      onClick={() => updateParams({ page: String(page - 1) })}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={page >= pages || loading}
                      onClick={() => updateParams({ page: String(page + 1) })}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="hidden min-h-[520px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm xl:block">
          {selected ? (
            <EmailDetailView
              tenantSlug={tenantSlug}
              email={selected}
              onChanged={handleRefresh}
            />
          ) : (
            <div className="flex h-full min-h-[520px] flex-col items-center justify-center px-6 text-center">
              <p className="text-base font-medium text-[var(--foreground)]">Select an email to read</p>
              <p className="mt-1 max-w-xs text-sm text-zinc-500">
                Choose a message from the list to view its content, attachments, and CRM links.
              </p>
            </div>
          )}
        </section>
      </div>

      {selected && (
        <EmailDetailDrawer
          tenantSlug={tenantSlug}
          email={selected}
          onClose={() => updateParams({ id: null })}
          onChanged={handleRefresh}
        />
      )}

      <EmailComposeDialog
        open={composeOpen}
        tenantSlug={tenantSlug}
        onClose={() => setComposeOpen(false)}
        onSent={handleRefresh}
      />
    </div>
  );
}
