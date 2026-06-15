"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Plus, Search, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  deleteLead,
  formatLeadName,
  listLeads,
  getLeadMeta,
  SOURCE_LABELS,
  STATUS_LABELS,
} from "@/lib/api/leads";
import { convertLeadToContact } from "@/lib/api/contacts";
import { listMembers } from "@/lib/api/tenants";
import type { Lead, LeadMeta, Member } from "@/types/api";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  contacted: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  qualified: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  unqualified: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  converted: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

interface LeadsPageProps {
  tenantSlug: string;
}

export function LeadsPage({ tenantSlug }: LeadsPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [meta, setMeta] = useState<LeadMeta | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const source = searchParams.get("source") ?? "";
  const assignedTo = searchParams.get("assigned_to_id") ?? "";
  const page = Number(searchParams.get("page") ?? "1");

  const [searchInput, setSearchInput] = useState(q);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      });
      router.push(`/${tenantSlug}/leads?${params.toString()}`);
    },
    [router, searchParams, tenantSlug],
  );

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const leadData = await listLeads(tenantSlug, {
        q: q || undefined,
        status: status || undefined,
        source: source || undefined,
        assigned_to_id: assignedTo || undefined,
        page,
        page_size: 10,
      });
      setLeads(leadData.items);
      setTotal(leadData.total);
      setPages(leadData.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, q, status, source, assignedTo, page]);

  useEffect(() => {
    void getLeadMeta(tenantSlug).then(setMeta);
    void listMembers(tenantSlug).then(setMembers);
  }, [tenantSlug]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  async function handleDelete(lead: Lead) {
    if (!confirm(`Delete lead "${formatLeadName(lead)}"?`)) return;
    try {
      await deleteLead(tenantSlug, lead.id);
      await loadLeads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete lead");
    }
  }

  async function handleConvert(lead: Lead) {
    if (!confirm(`Convert "${formatLeadName(lead)}" to a contact?`)) return;
    setConvertingId(lead.id);
    setError(null);
    try {
      const contact = await convertLeadToContact(tenantSlug, lead.id);
      router.push(`/${tenantSlug}/contacts/${contact.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert lead");
    } finally {
      setConvertingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Leads</h2>
          <p className="text-zinc-500">{total} lead{total !== 1 ? "s" : ""} total</p>
        </div>
        <Link href={`/${tenantSlug}/leads/new`} className="inline-flex">
          <Button>
            <Plus className="h-4 w-4" />
            New lead
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search & filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-wrap gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              updateParams({ q: searchInput.trim() || null, page: "1" });
            }}
          >
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="pl-9"
                placeholder="Search name, email, company, phone..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <select
              className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              value={status}
              onChange={(e) => updateParams({ status: e.target.value || null, page: "1" })}
            >
              <option value="">All statuses</option>
              {meta?.statuses.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s] ?? s}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              value={source}
              onChange={(e) => updateParams({ source: e.target.value || null, page: "1" })}
            >
              <option value="">All sources</option>
              {meta?.sources.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABELS[s] ?? s}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              value={assignedTo}
              onChange={(e) => updateParams({ assigned_to_id: e.target.value || null, page: "1" })}
            >
              <option value="">All assignees</option>
              {members.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.full_name}
                </option>
              ))}
            </select>
            <Button type="submit">Search</Button>
            {(q || status || source || assignedTo) && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchInput("");
                  router.push(`/${tenantSlug}/leads`);
                }}
              >
                Clear
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {error && <p className="p-4 text-sm text-red-600">{error}</p>}
          {loading ? (
            <p className="p-8 text-center text-zinc-500">Loading leads...</p>
          ) : leads.length === 0 ? (
            <p className="p-8 text-center text-zinc-500">No leads found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-left dark:border-zinc-800">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Assigned</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="border-b border-zinc-100 dark:border-zinc-800/50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{formatLeadName(lead)}</div>
                        <div className="text-zinc-500">{lead.email ?? lead.phone ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3">{lead.company ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            STATUS_COLORS[lead.status] ?? STATUS_COLORS.new,
                          )}
                        >
                          {STATUS_LABELS[lead.status] ?? lead.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {lead.source ? (SOURCE_LABELS[lead.source] ?? lead.source) : "—"}
                      </td>
                      <td className="px-4 py-3">{lead.assigned_to?.full_name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {lead.status !== "converted" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Convert to contact"
                              disabled={convertingId === lead.id}
                              onClick={() => void handleConvert(lead)}
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          )}
                          <Link href={`/${tenantSlug}/leads/${lead.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(lead)}
                            aria-label={`Delete ${formatLeadName(lead)}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
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

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            Page {page} of {pages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateParams({ page: String(page - 1) })}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => updateParams({ page: String(page + 1) })}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
