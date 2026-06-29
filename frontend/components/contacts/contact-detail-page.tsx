"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  Mail,
  Pencil,
  Phone,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { ActivityFormDialog } from "@/components/activities/activity-form-dialog";
import { ActivityTimeline } from "@/components/activities/activity-timeline";
import { ContactFormDialog } from "@/components/contacts/contact-form-dialog";
import {
  EntityNotesEmpty,
  EntityNotesPanel,
  EntityNotesPreview,
} from "@/components/shared/entity-notes-panel";
import { EntityTasksPanel } from "@/components/tasks/entity-tasks-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermissions } from "@/contexts/permissions-context";
import { createActivity } from "@/lib/api/activities";
import {
  deleteContact,
  formatContactName,
  formatDate,
  getContact,
  updateContact,
} from "@/lib/api/contacts";
import { getInitials } from "@/lib/dashboard-format";
import { listMembers } from "@/lib/api/tenants";
import type { Contact, Member } from "@/types/api";
import { cn } from "@/lib/utils";

const TABS = ["Overview", "Notes", "Activity", "Tasks"] as const;
type Tab = (typeof TABS)[number];

interface ContactDetailPageProps {
  tenantSlug: string;
  contactId: string;
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <div className="mt-1 text-sm text-[var(--foreground)]">{children}</div>
    </div>
  );
}

export function ContactDetailPage({ tenantSlug, contactId }: ContactDetailPageProps) {
  const router = useRouter();
  const { canWrite, canDelete } = usePermissions();
  const [contact, setContact] = useState<Contact | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function loadContact() {
    setLoading(true);
    setError(null);
    try {
      const data = await getContact(tenantSlug, contactId);
      setContact(data);
      setNotesDraft(data.notes ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contact");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadContact();
    void listMembers(tenantSlug).then(setMembers);
  }, [tenantSlug, contactId]);

  async function handleSaveNotes() {
    if (!contact) return;
    setSavingNotes(true);
    setActionError(null);
    try {
      const updated = await updateContact(tenantSlug, contact.id, {
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        company_id: contact.company_id,
        job_title: contact.job_title,
        lead_id: contact.lead_id,
        assigned_to_id: contact.assigned_to_id,
        notes: notesDraft.trim() || null,
      });
      setContact(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to save notes");
      throw err;
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleDelete() {
    if (!contact || !confirm(`Delete contact "${formatContactName(contact)}"?`)) return;
    setActionError(null);
    try {
      await deleteContact(tenantSlug, contact.id);
      router.push(`/${tenantSlug}/contacts`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete contact");
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="flex gap-4">
          <div className="h-16 w-16 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          <div className="space-y-2">
            <div className="h-8 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-[var(--border)] bg-zinc-100 dark:bg-zinc-900" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="space-y-4">
        <Link href={`/${tenantSlug}/contacts`} className="inline-flex items-center gap-2 text-sm text-zinc-500">
          <ArrowLeft className="h-4 w-4" />
          Back to contacts
        </Link>
        <p className="text-red-600">{error ?? "Contact not found"}</p>
      </div>
    );
  }

  const displayName = formatContactName(contact);
  const subtitle = [contact.job_title, contact.linked_company?.company_name ?? contact.company]
    .filter(Boolean)
    .join(" · ");
  const hasNotes = Boolean(contact.notes?.trim());
  const notesDirty = notesDraft !== (contact.notes ?? "");

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1 space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500/15 to-violet-500/15 text-xl font-semibold text-sky-700 dark:text-sky-300">
            {getInitials(displayName)}
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <Link
              href={`/${tenantSlug}/contacts`}
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to contacts
            </Link>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">{displayName}</h2>
              {subtitle && <p className="mt-1 text-zinc-500">{subtitle}</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-sky-300 hover:text-sky-700 dark:text-zinc-300"
                >
                  <Mail className="h-3.5 w-3.5" />
                  {contact.email}
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-sky-300 hover:text-sky-700 dark:text-zinc-300"
                >
                  <Phone className="h-3.5 w-3.5" />
                  {contact.phone}
                </a>
              )}
              {contact.lead && (
                <Badge variant="secondary" className="gap-1">
                  <ArrowRightLeft className="h-3 w-3" />
                  Converted lead
                </Badge>
              )}
            </div>
          </div>
        </div>

        {actionError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            {actionError}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Contact information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DetailField label="Email">{contact.email ?? "—"}</DetailField>
              <DetailField label="Phone">{contact.phone ?? "—"}</DetailField>
              <DetailField label="Job title">{contact.job_title ?? "—"}</DetailField>
              <DetailField label="Created">{formatDate(contact.created_at)}</DetailField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Company</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <DetailField label="Organization">
                {contact.linked_company ? (
                  <Link
                    href={`/${tenantSlug}/companies/${contact.linked_company.id}`}
                    className="font-medium text-[var(--primary)] hover:underline"
                  >
                    {contact.linked_company.company_name}
                  </Link>
                ) : (
                  (contact.company ?? "—")
                )}
              </DetailField>
              {contact.lead && (
                <DetailField label="Source lead">
                  <span>
                    {contact.lead.first_name} {contact.lead.last_name}
                    <span className="ml-2 text-zinc-400">({contact.lead.status})</span>
                  </span>
                </DetailField>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Assigned to</CardTitle>
            </CardHeader>
            <CardContent>
              {contact.assigned_to ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-muted)] text-sm font-medium">
                    {getInitials(contact.assigned_to.full_name)}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{contact.assigned_to.full_name}</p>
                    <p className="text-xs text-zinc-500">{contact.assigned_to.email}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Unassigned</p>
              )}
            </CardContent>
          </Card>
        </div>

        {hasNotes && activeTab !== "Notes" && activeTab !== "Overview" && (
          <EntityNotesPreview
            notes={contact.notes!}
            onEdit={canWrite("contact") ? () => setActiveTab("Notes") : undefined}
          />
        )}

        <div className="flex gap-1 overflow-x-auto border-b border-zinc-200 dark:border-zinc-800">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={cn(
                "shrink-0 px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab
                  ? "border-b-2 border-zinc-900 text-zinc-900 dark:border-white dark:text-white"
                  : "text-zinc-500 hover:text-zinc-700",
              )}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {tab === "Notes" && notesDirty && (
                <span className="ml-2 inline-block h-2 w-2 rounded-full bg-amber-500" title="Unsaved changes" />
              )}
            </button>
          ))}
        </div>

        {activeTab === "Overview" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ActivityTimeline
                  tenantSlug={tenantSlug}
                  entityType="contact"
                  entityId={contact.id}
                  compact
                  pageSize={5}
                  refreshKey={refreshKey}
                />
              </CardContent>
            </Card>

            <div>
              {hasNotes ? (
                <EntityNotesPreview
                  notes={contact.notes!}
                  onEdit={canWrite("contact") ? () => setActiveTab("Notes") : undefined}
                />
              ) : (
                <EntityNotesEmpty onAdd={canWrite("contact") ? () => setActiveTab("Notes") : undefined} />
              )}
            </div>
          </div>
        )}

        {activeTab === "Notes" && (
          <EntityNotesPanel
            value={notesDraft}
            onChange={setNotesDraft}
            onSave={handleSaveNotes}
            saving={savingNotes}
            readOnly={!canWrite("contact")}
            placeholder="Add notes about this contact — meeting summaries, preferences, follow-up context..."
            description="Team-visible notes attached to this contact record."
          />
        )}

        {activeTab === "Activity" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Activity timeline</CardTitle>
              {canWrite("activity") && (
                <Button size="sm" onClick={() => setActivityFormOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Log activity
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <ActivityTimeline
                tenantSlug={tenantSlug}
                entityType="contact"
                entityId={contact.id}
                showDelete
                refreshKey={refreshKey}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === "Tasks" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <EntityTasksPanel tenantSlug={tenantSlug} entityType="contact" entityId={contact.id} />
            </CardContent>
          </Card>
        )}
      </div>

      <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-72">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {canWrite("contact") && (
              <Button variant="outline" className="justify-start" onClick={() => setFormOpen(true)}>
                <Pencil className="h-4 w-4" />
                Edit contact
              </Button>
            )}
            {canDelete("contact") && (
              <Button
                variant="outline"
                className="justify-start text-red-600 hover:text-red-700"
                onClick={() => void handleDelete()}
              >
                <Trash2 className="h-4 w-4" />
                Delete contact
              </Button>
            )}
            {(canWrite("contact") || canDelete("contact")) && <hr className="my-1 border-[var(--border)]" />}
            {canWrite("activity") && (
              <Button variant="outline" className="justify-start" onClick={() => setActivityFormOpen(true)}>
                <Plus className="h-4 w-4" />
                Log activity
              </Button>
            )}
            {canWrite("contact") && (
              <Button variant="outline" className="justify-start" onClick={() => setActiveTab("Notes")}>
                <Pencil className="h-4 w-4" />
                {hasNotes ? "Edit notes" : "Add notes"}
              </Button>
            )}
            {contact.linked_company && (
              <Link href={`/${tenantSlug}/companies/${contact.linked_company.id}`}>
                <Button variant="outline" className="w-full justify-start">
                  <Building2 className="h-4 w-4" />
                  View company
                </Button>
              </Link>
            )}
            {contact.lead && (
              <Link href={`/${tenantSlug}/leads/${contact.lead_id}`}>
                <Button variant="outline" className="w-full justify-start">
                  <User className="h-4 w-4" />
                  View source lead
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </aside>

      <ActivityFormDialog
        open={activityFormOpen}
        tenantSlug={tenantSlug}
        defaultEntityType="contact"
        defaultEntityId={contact.id}
        lockEntity
        onClose={() => setActivityFormOpen(false)}
        onSubmit={async (data) => {
          await createActivity(tenantSlug, data);
          setRefreshKey((k) => k + 1);
        }}
      />

      <ContactFormDialog
        tenantSlug={tenantSlug}
        open={formOpen}
        members={members}
        initial={contact}
        onClose={() => setFormOpen(false)}
        onSubmit={async (data) => {
          await updateContact(tenantSlug, contact.id, data);
          await loadContact();
        }}
      />
    </div>
  );
}
