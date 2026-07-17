"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, LayoutGrid, List, Plus, Search, Trash2 } from "lucide-react";
import { SupportNavTabs } from "@/components/support/support-nav-tabs";
import { TicketFormDialog } from "@/components/support/ticket-form-dialog";
import { TicketsKanban } from "@/components/support/tickets-kanban";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/contexts/permissions-context";
import {
  archiveTicket,
  bulkTicketAction,
  CHANNEL_LABELS,
  createTicket,
  deleteTicket,
  formatDateTime,
  formatTicketNumber,
  getSupportMeta,
  isSlaOverdue,
  listTickets,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from "@/lib/api/support";
import type { SupportTicket, TicketMeta } from "@/types/support";
import { cn } from "@/lib/utils";

interface TicketsPageProps {
  tenantSlug: string;
}

export function TicketsPage({ tenantSlug }: TicketsPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canWrite, canDelete, loading: permLoading } = usePermissions();

  const view = searchParams.get("view") ?? "table";
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const channel = searchParams.get("channel") ?? "";
  const archived = searchParams.get("archived") === "true";
  const page = Number(searchParams.get("page") ?? "1");

  const [searchInput, setSearchInput] = useState(q);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<TicketMeta | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      });
      router.push(`/${tenantSlug}/support/tickets?${params.toString()}`);
    },
    [router, searchParams, tenantSlug],
  );

  const loadTickets = useCallback(async () => {
    if (view === "kanban") return;
    setLoading(true);
    setError(null);
    try {
      const data = await listTickets(tenantSlug, {
        q: q || undefined,
        status: status || undefined,
        priority: priority || undefined,
        channel: channel || undefined,
        is_archived: archived ? true : false,
        page,
        page_size: 15,
      });
      setTickets(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, q, status, priority, channel, archived, page, view]);

  useEffect(() => {
    void getSupportMeta(tenantSlug).then(setMeta).catch(() => setMeta(null));
  }, [tenantSlug]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets, refreshKey]);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulk(action: "close" | "archive") {
    if (selected.size === 0) return;
    try {
      await bulkTicketAction(tenantSlug, {
        ticket_ids: Array.from(selected),
        action,
      });
      setSelected(new Set());
      setRefreshKey((k) => k + 1);
      await loadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk action failed");
    }
  }

  async function handleDelete(ticket: SupportTicket) {
    if (!confirm(`Delete ticket "${ticket.subject}"?`)) return;
    try {
      await deleteTicket(tenantSlug, ticket.id);
      setRefreshKey((k) => k + 1);
      await loadTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tickets</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {view === "table" ? `${total} ticket${total !== 1 ? "s" : ""}` : "Kanban board by status"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={view === "table" ? "default" : "outline"} onClick={() => updateParams({ view: "table" })}>
            <List className="h-4 w-4" />
            Table
          </Button>
          <Button variant={view === "kanban" ? "default" : "outline"} onClick={() => updateParams({ view: "kanban" })}>
            <LayoutGrid className="h-4 w-4" />
            Kanban
          </Button>
          {!permLoading && canWrite("support") && (
            <Button onClick={() => setFormOpen(true)} className="bg-violet-600 hover:bg-violet-700">
              <Plus className="h-4 w-4" />
              New Ticket
            </Button>
          )}
        </div>
      </div>

      <SupportNavTabs tenantSlug={tenantSlug} />

      <Card className="border-[var(--border)]/80 bg-[var(--surface)]/80 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6"
            onSubmit={(e) => {
              e.preventDefault();
              updateParams({ q: searchInput.trim() || null, page: "1" });
            }}
          >
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                className="pl-9"
                placeholder="Search tickets…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <select
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              value={status}
              onChange={(e) => updateParams({ status: e.target.value || null, page: "1" })}
            >
              <option value="">All statuses</option>
              {TICKET_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              value={priority}
              onChange={(e) => updateParams({ priority: e.target.value || null, page: "1" })}
            >
              <option value="">All priorities</option>
              {TICKET_PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              value={channel}
              onChange={(e) => updateParams({ channel: e.target.value || null, page: "1" })}
            >
              <option value="">All channels</option>
              {(meta?.channels ?? []).map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABELS[c] ?? c}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={archived}
                onChange={(e) => updateParams({ archived: e.target.checked ? "true" : null, page: "1" })}
              />
              Archived
            </label>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      {selected.size > 0 && !permLoading && canWrite("support") && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-2">
          <span className="text-sm">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => void handleBulk("close")}>
            Close
          </Button>
          <Button size="sm" variant="outline" onClick={() => void handleBulk("archive")}>
            <Archive className="mr-1 h-3 w-3" />
            Archive
          </Button>
        </div>
      )}

      {view === "kanban" ? (
        <TicketsKanban
          tenantSlug={tenantSlug}
          refreshKey={refreshKey}
          filters={{ q: q || undefined, priority: priority || undefined, channel: channel || undefined, is_archived: archived }}
        />
      ) : (
        <Card className="border-[var(--border)]/80 bg-[var(--surface)]/80 backdrop-blur-sm">
          <CardContent className="p-0">
            {error && <p className="p-4 text-sm text-red-600">{error}</p>}
            {loading ? (
              <div className="h-48 animate-pulse bg-[var(--surface-muted)]" />
            ) : tickets.length === 0 ? (
              <p className="p-8 text-center text-[var(--muted-foreground)]">No tickets match your filters</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left">
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.size === tickets.length && tickets.length > 0}
                          onChange={(e) =>
                            setSelected(e.target.checked ? new Set(tickets.map((t) => t.id)) : new Set())
                          }
                        />
                      </th>
                      <th className="px-4 py-3 font-medium">Ticket</th>
                      <th className="px-4 py-3 font-medium">Subject</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Priority</th>
                      <th className="px-4 py-3 font-medium">Channel</th>
                      <th className="px-4 py-3 font-medium">Assignee</th>
                      <th className="px-4 py-3 font-medium">Updated</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className={cn(
                          "border-b border-[var(--border)]/50 hover:bg-[var(--surface-muted)]/50",
                          isSlaOverdue(ticket) && "bg-red-50/50 dark:bg-red-950/10",
                        )}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(ticket.id)}
                            onChange={() => toggleSelect(ticket.id)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/${tenantSlug}/support/tickets/${ticket.id}`}
                            className="font-mono text-xs text-violet-600 hover:underline"
                          >
                            {formatTicketNumber(ticket)}
                          </Link>
                        </td>
                        <td className="max-w-xs truncate px-4 py-3">
                          <Link href={`/${tenantSlug}/support/tickets/${ticket.id}`} className="hover:underline">
                            {ticket.subject}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[ticket.status])}>
                            {STATUS_LABELS[ticket.status] ?? ticket.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", PRIORITY_COLORS[ticket.priority])}>
                            {PRIORITY_LABELS[ticket.priority]}
                          </span>
                        </td>
                        <td className="px-4 py-3">{CHANNEL_LABELS[ticket.channel] ?? ticket.channel}</td>
                        <td className="px-4 py-3">{ticket.assigned_to?.full_name ?? "—"}</td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)]">{formatDateTime(ticket.updated_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            {!permLoading && canWrite("support") && !ticket.is_archived && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => void archiveTicket(tenantSlug, ticket.id).then(() => setRefreshKey((k) => k + 1))}
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            )}
                            {!permLoading && canDelete("support") && (
                              <Button variant="ghost" size="sm" onClick={() => void handleDelete(ticket)}>
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {view === "table" && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--muted-foreground)]">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => updateParams({ page: String(page - 1) })}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <TicketFormDialog
        open={formOpen}
        meta={meta}
        onClose={() => setFormOpen(false)}
        onSubmit={async (data) => {
          await createTicket(tenantSlug, data);
          setRefreshKey((k) => k + 1);
          await loadTickets();
        }}
      />
    </div>
  );
}
