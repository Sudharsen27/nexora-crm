"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivityFormDialog } from "@/components/activities/activity-form-dialog";
import { ActivityTimeline } from "@/components/activities/activity-timeline";
import { ContactFormDialog } from "@/components/contacts/contact-form-dialog";
import { EntityTasksPanel } from "@/components/tasks/entity-tasks-panel";
import { createActivity } from "@/lib/api/activities";
import {
  deleteContact,
  formatContactName,
  formatDate,
  getContact,
  updateContact,
} from "@/lib/api/contacts";
import { listMembers } from "@/lib/api/tenants";
import type { Contact, Member } from "@/types/api";
import { cn } from "@/lib/utils";

const TABS = ["Overview", "Notes", "Activity", "Tasks"] as const;
type Tab = (typeof TABS)[number];

interface ContactDetailPageProps {
  tenantSlug: string;
  contactId: string;
}

export function ContactDetailPage({ tenantSlug, contactId }: ContactDetailPageProps) {
  const router = useRouter();
  const [contact, setContact] = useState<Contact | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  async function loadContact() {
    setLoading(true);
    setError(null);
    try {
      const data = await getContact(tenantSlug, contactId);
      setContact(data);
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

  async function handleDelete() {
    if (!contact || !confirm(`Delete contact "${formatContactName(contact)}"?`)) return;
    try {
      await deleteContact(tenantSlug, contact.id);
      router.push(`/${tenantSlug}/contacts`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete contact");
    }
  }

  if (loading) {
    return <p className="text-zinc-500">Loading contact...</p>;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href={`/${tenantSlug}/contacts`}
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to contacts
          </Link>
          <h2 className="text-2xl font-semibold">{formatContactName(contact)}</h2>
          <p className="text-zinc-500">{contact.job_title ?? contact.company ?? "Contact"}</p>
        </div>
        <div className="flex gap-2">
          {activeTab === "Activity" && (
            <Button onClick={() => setActivityFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Log activity
            </Button>
          )}
          <Button variant="outline" onClick={() => setFormOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" onClick={() => void handleDelete()}>
            <Trash2 className="h-4 w-4 text-red-600" />
            Delete
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={cn(
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab
                ? "border-b-2 border-zinc-900 text-zinc-900 dark:border-white dark:text-white"
                : "text-zinc-500 hover:text-zinc-700",
            )}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-zinc-500">Email</p>
                <p>{contact.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-zinc-500">Phone</p>
                <p>{contact.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-zinc-500">Job title</p>
                <p>{contact.job_title ?? "—"}</p>
              </div>
              <div>
                <p className="text-zinc-500">Created</p>
                <p>{formatDate(contact.created_at)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-zinc-500">Company</p>
                <p>{contact.company ?? "—"}</p>
              </div>
              {contact.lead && (
                <div>
                  <p className="text-zinc-500">Converted from lead</p>
                  <p>
                    {contact.lead.first_name} {contact.lead.last_name}
                    <span className="ml-2 text-zinc-400">({contact.lead.status})</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Assigned user</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {contact.assigned_to ? (
                <div>
                  <p className="font-medium">{contact.assigned_to.full_name}</p>
                  <p className="text-zinc-500">{contact.assigned_to.email}</p>
                </div>
              ) : (
                <p className="text-zinc-500">Unassigned</p>
              )}
            </CardContent>
          </Card>

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
        </div>
      )}

      {activeTab === "Notes" && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-zinc-500">
            Notes will be available in a future release.
          </CardContent>
        </Card>
      )}

      {activeTab === "Activity" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity timeline</CardTitle>
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
