"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { SupportTicket } from "@/types/support";
import {
  formatTicketNumber,
  listTickets,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  updateTicket,
} from "@/lib/api/support";
import { usePermissions } from "@/contexts/permissions-context";
import { cn } from "@/lib/utils";

const KANBAN_COLUMNS = [
  "new",
  "open",
  "assigned",
  "in_progress",
  "waiting_customer",
  "escalated",
  "resolved",
] as const;

interface TicketsKanbanProps {
  tenantSlug: string;
  filters?: {
    q?: string;
    priority?: string;
    channel?: string;
    is_archived?: boolean;
  };
  refreshKey?: number;
}

export function TicketsKanban({ tenantSlug, filters = {}, refreshKey = 0 }: TicketsKanbanProps) {
  const { canWrite, loading: permLoading } = usePermissions();
  const canEdit = !permLoading && canWrite("support");
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTickets(tenantSlug, {
        ...filters,
        page: 1,
        page_size: 100,
        is_archived: filters.is_archived ?? false,
      });
      setTickets(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, filters, refreshKey]);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeStatus(ticket: SupportTicket, status: string) {
    if (!canEdit || ticket.status === status) return;
    try {
      await updateTicket(tenantSlug, ticket.id, { status });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }

  if (loading) {
    return <div className="h-64 animate-pulse rounded-xl bg-[var(--surface-muted)]" />;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_COLUMNS.map((status) => {
        const columnTickets = tickets.filter((t) => t.status === status);
        return (
          <div
            key={status}
            className="min-w-[260px] flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[status])}>
                {STATUS_LABELS[status]}
              </span>
              <span className="text-xs text-[var(--muted-foreground)]">{columnTickets.length}</span>
            </div>
            <div className="space-y-2 p-2">
              {columnTickets.map((ticket) => (
                <KanbanCard
                  key={ticket.id}
                  ticket={ticket}
                  tenantSlug={tenantSlug}
                  canEdit={canEdit}
                  onStatusChange={(s) => void changeStatus(ticket, s)}
                />
              ))}
              {columnTickets.length === 0 && (
                <p className="py-6 text-center text-xs text-[var(--muted-foreground)]">No tickets</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  ticket,
  tenantSlug,
  canEdit,
  onStatusChange,
}: {
  ticket: SupportTicket;
  tenantSlug: string;
  canEdit: boolean;
  onStatusChange: (status: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm transition hover:shadow-md">
      <Link href={`/${tenantSlug}/support/tickets/${ticket.id}`} className="block">
        <p className="font-mono text-xs text-violet-600">{formatTicketNumber(ticket)}</p>
        <p className="mt-1 line-clamp-2 text-sm font-medium">{ticket.subject}</p>
      </Link>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", PRIORITY_COLORS[ticket.priority])}>
          {PRIORITY_LABELS[ticket.priority] ?? ticket.priority}
        </span>
        <span className="truncate text-xs text-[var(--muted-foreground)]">
          {ticket.assigned_to?.full_name ?? "Unassigned"}
        </span>
      </div>
      {canEdit && (
        <div className="relative mt-2">
          <button
            type="button"
            className="w-full rounded-lg border border-[var(--border)] px-2 py-1 text-xs hover:bg-[var(--surface-muted)]"
            onClick={() => setMenuOpen((o) => !o)}
          >
            Move to…
          </button>
          {menuOpen && (
            <div className="absolute left-0 right-0 z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-lg">
              {KANBAN_COLUMNS.filter((s) => s !== ticket.status).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="block w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--surface-muted)]"
                  onClick={() => {
                    setMenuOpen(false);
                    onStatusChange(s);
                  }}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
