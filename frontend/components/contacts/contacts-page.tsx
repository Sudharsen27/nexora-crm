"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRightLeft, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/contexts/permissions-context";
import { ContactFormDialog } from "@/components/contacts/contact-form-dialog";
import {
  convertLeadToContact,
  createContact,
  deleteContact,
  formatContactName,
  formatDate,
  listContacts,
  updateContact,
} from "@/lib/api/contacts";
import { formatLeadName, listLeads } from "@/lib/api/leads";
import { listMembers } from "@/lib/api/tenants";
import type { Contact, Lead, Member } from "@/types/api";

interface ContactsPageProps {
  tenantSlug: string;
}

export function ContactsPage({ tenantSlug }: ContactsPageProps) {
  const router = useRouter();
  const { canWrite, canDelete } = usePermissions();
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertibleLeads, setConvertibleLeads] = useState<Lead[]>([]);
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const q = searchParams.get("q") ?? "";
  const company = searchParams.get("company") ?? "";
  const assignedTo = searchParams.get("assigned_to_id") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const sortBy = searchParams.get("sort_by") ?? "created_at";
  const sortOrder = (searchParams.get("sort_order") ?? "desc") as "asc" | "desc";

  const [searchInput, setSearchInput] = useState(q);
  const [companyInput, setCompanyInput] = useState(company);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      });
      router.push(`/${tenantSlug}/contacts?${params.toString()}`);
    },
    [router, searchParams, tenantSlug],
  );

  const loadContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listContacts(tenantSlug, {
        q: q || undefined,
        company: company || undefined,
        assigned_to_id: assignedTo || undefined,
        page,
        page_size: 10,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setContacts(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, q, company, assignedTo, page, sortBy, sortOrder]);

  useEffect(() => {
    void listMembers(tenantSlug).then(setMembers);
  }, [tenantSlug]);

  useEffect(() => {
    void loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    setSearchInput(q);
    setCompanyInput(company);
  }, [q, company]);

  async function openConvertDialog() {
    setConvertOpen(true);
    try {
      const data = await listLeads(tenantSlug, {
        page_size: 50,
        status: "qualified",
      });
      const newLeads = await listLeads(tenantSlug, { page_size: 50, status: "new" });
      const contacted = await listLeads(tenantSlug, { page_size: 50, status: "contacted" });
      const combined = [...data.items, ...newLeads.items, ...contacted.items].filter(
        (lead) => lead.status !== "converted",
      );
      const unique = Array.from(new Map(combined.map((lead) => [lead.id, lead])).values());
      setConvertibleLeads(unique);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leads");
    }
  }

  async function handleConvert(leadId: string) {
    setConvertingId(leadId);
    setError(null);
    try {
      const contact = await convertLeadToContact(tenantSlug, leadId);
      setConvertOpen(false);
      router.push(`/${tenantSlug}/contacts/${contact.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to convert lead");
    } finally {
      setConvertingId(null);
    }
  }

  async function handleDelete(contact: Contact) {
    if (!confirm(`Delete contact "${formatContactName(contact)}"?`)) return;
    try {
      await deleteContact(tenantSlug, contact.id);
      await loadContacts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete contact");
    }
  }

  function toggleSort(field: string) {
    if (sortBy === field) {
      updateParams({ sort_order: sortOrder === "asc" ? "desc" : "asc", page: "1" });
    } else {
      updateParams({ sort_by: field, sort_order: "asc", page: "1" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Contacts</h2>
          <p className="text-zinc-500">
            {total} contact{total !== 1 ? "s" : ""} total
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canWrite("contact") && canWrite("lead") && (
            <Button variant="outline" onClick={() => void openConvertDialog()}>
              <ArrowRightLeft className="h-4 w-4" />
              Convert lead
            </Button>
          )}
          {canWrite("contact") && (
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              New contact
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search & filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6"
            onSubmit={(e) => {
              e.preventDefault();
              updateParams({
                q: searchInput.trim() || null,
                company: companyInput.trim() || null,
                page: "1",
              });
            }}
          >
            <div className="relative sm:col-span-2 xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="pl-9"
                placeholder="Search name, email, company, phone..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Input
              className="min-w-[160px]"
              placeholder="Company filter"
              value={companyInput}
              onChange={(e) => setCompanyInput(e.target.value)}
            />
            <select
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              value={assignedTo}
              onChange={(e) => updateParams({ assigned_to_id: e.target.value || null, page: "1" })}
            >
              <option value="">All owners</option>
              {members.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.full_name}
                </option>
              ))}
            </select>
            <Button type="submit">Search</Button>
            {(q || company || assignedTo) && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchInput("");
                  setCompanyInput("");
                  router.push(`/${tenantSlug}/contacts`);
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
            <div className="p-6">
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="h-12 rounded-xl bg-[var(--surface-muted)]" />
                ))}
              </div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <p className="text-base font-medium text-[var(--foreground)]">No contacts found</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">Create a contact or convert a lead.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left">
                    <th className="px-4 py-3 font-medium">
                      <button type="button" onClick={() => toggleSort("first_name")}>
                        Name
                      </button>
                    </th>
                    <th className="px-4 py-3 font-medium">
                      <button type="button" onClick={() => toggleSort("company")}>
                        Company
                      </button>
                    </th>
                    <th className="px-4 py-3 font-medium">
                      <button type="button" onClick={() => toggleSort("email")}>
                        Email
                      </button>
                    </th>
                    <th className="px-4 py-3 font-medium">Phone</th>
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium">
                      <button type="button" onClick={() => toggleSort("created_at")}>
                        Created
                      </button>
                    </th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr
                      key={contact.id}
                      className="border-b border-[var(--border)]/70 transition-colors hover:bg-[var(--surface-muted)]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/${tenantSlug}/contacts/${contact.id}`}
                          className="font-medium hover:underline"
                        >
                          {formatContactName(contact)}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{contact.company ?? "—"}</td>
                      <td className="px-4 py-3">{contact.email ?? "—"}</td>
                      <td className="px-4 py-3">{contact.phone ?? "—"}</td>
                      <td className="px-4 py-3">{contact.assigned_to?.full_name ?? "—"}</td>
                      <td className="px-4 py-3">{formatDate(contact.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {canWrite("contact") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditing(contact);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete("contact") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(contact)}
                              aria-label={`Delete ${formatContactName(contact)}`}
                            >
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

      {pages > 1 && (
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
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

      <ContactFormDialog
        tenantSlug={tenantSlug}
        open={formOpen}
        members={members}
        initial={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={async (data) => {
          if (editing) {
            await updateContact(tenantSlug, editing.id, data);
          } else {
            await createContact(tenantSlug, data);
          }
          await loadContacts();
        }}
      />

      {convertOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Convert lead to contact</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Select a lead to create a contact and mark the lead as converted.
            </p>
            <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
              {convertibleLeads.length === 0 ? (
                <p className="text-sm text-zinc-500">No eligible leads found.</p>
              ) : (
                convertibleLeads.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] px-4 py-3 text-left transition-colors hover:bg-[var(--surface-muted)]"
                    disabled={convertingId === lead.id}
                    onClick={() => void handleConvert(lead.id)}
                  >
                    <div>
                      <div className="font-medium">{formatLeadName(lead)}</div>
                      <div className="text-sm text-zinc-500">{lead.company ?? lead.email ?? "—"}</div>
                    </div>
                    <span className="text-sm text-zinc-500">
                      {convertingId === lead.id ? "Converting..." : "Convert"}
                    </span>
                  </button>
                ))
              )}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="outline" onClick={() => setConvertOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
