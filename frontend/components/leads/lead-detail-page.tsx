"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  Briefcase,
  ListTodo,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";
import { ActivityFormDialog } from "@/components/activities/activity-form-dialog";
import { ActivityTimeline } from "@/components/activities/activity-timeline";
import { EntityEmailsPanel } from "@/components/emails/entity-emails-panel";
import { EntityNotesPanel, EntityNotesPreview } from "@/components/shared/entity-notes-panel";
import { DealFormDialog } from "@/components/deals/deal-form-dialog";
import { LeadFormDialog } from "@/components/leads/lead-form-dialog";
import { EntityTasksPanel } from "@/components/tasks/entity-tasks-panel";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermissions } from "@/contexts/permissions-context";
import { createActivity } from "@/lib/api/activities";
import { createCompany } from "@/lib/api/companies";
import { convertLeadToContact } from "@/lib/api/contacts";
import { createDeal, formatCurrency as formatDealCurrency, getDealMeta } from "@/lib/api/deals";
import {
  deleteLead,
  formatCurrency,
  formatDate,
  formatLeadName,
  getLead,
  getLeadContact,
  getLeadMeta,
  getLeadScore,
  listLeadDeals,
  SOURCE_LABELS,
  STATUS_COLORS,
  STATUS_LABELS,
  updateLead,
} from "@/lib/api/leads";
import { createTask } from "@/lib/api/tasks";
import { listMembers } from "@/lib/api/tenants";
import type { Contact, Deal, DealStageMeta, Lead, LeadMeta, Member } from "@/types/api";
import { cn } from "@/lib/utils";

const TABS = ["Activities", "Tasks", "Deals", "Emails", "Timeline", "Notes"] as const;
type Tab = (typeof TABS)[number];

interface LeadDetailPageProps {
  tenantSlug: string;
  leadId: string;
}

function ScoreRing({ score }: { score: number }) {
  const color =
    score >= 75 ? "text-green-600" : score >= 45 ? "text-amber-600" : "text-zinc-500";
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full border-4 border-[var(--border)] text-lg font-bold",
          color,
        )}
      >
        {score}
      </div>
      <div>
        <p className="text-sm font-medium">Lead score</p>
        <p className="text-xs text-zinc-500">Based on status & profile</p>
      </div>
    </div>
  );
}

export function LeadDetailPage({ tenantSlug, leadId }: LeadDetailPageProps) {
  const router = useRouter();
  const { canWrite, canDelete } = usePermissions();
  const [lead, setLead] = useState<Lead | null>(null);
  const [meta, setMeta] = useState<LeadMeta | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [linkedContact, setLinkedContact] = useState<Contact | null>(null);
  const [dealStages, setDealStages] = useState<DealStageMeta[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("Activities");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [converting, setConverting] = useState(false);

  const [leadFormOpen, setLeadFormOpen] = useState(false);
  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);

  const loadLead = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLead(tenantSlug, leadId);
      setLead(data);
      setNotesDraft(data.notes ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lead");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, leadId]);

  const loadRelated = useCallback(async () => {
    try {
      const dealData = await listLeadDeals(tenantSlug, leadId);
      setDeals(dealData);
    } catch {
      setDeals([]);
    }
    try {
      const contact = await getLeadContact(tenantSlug, leadId);
      setLinkedContact(contact);
    } catch {
      setLinkedContact(null);
    }
  }, [tenantSlug, leadId]);

  useEffect(() => {
    void loadLead();
    void loadRelated();
    void Promise.all([getLeadMeta(tenantSlug), listMembers(tenantSlug), getDealMeta(tenantSlug)]).then(
      ([metaData, memberData, dealMeta]) => {
        setMeta(metaData);
        setMembers(memberData);
        setDealStages(dealMeta.stages ?? []);
      },
    );
  }, [tenantSlug, leadId, loadLead, loadRelated]);

  async function handleDelete() {
    if (!lead || !confirm(`Delete lead "${formatLeadName(lead)}"?`)) return;
    setActionError(null);
    try {
      await deleteLead(tenantSlug, lead.id);
      router.push(`/${tenantSlug}/leads`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete lead");
    }
  }

  async function handleConvertToContact() {
    if (!lead || lead.status === "converted") return;
    setConverting(true);
    setActionError(null);
    try {
      const contact = await convertLeadToContact(tenantSlug, lead.id);
      await loadLead();
      await loadRelated();
      router.push(`/${tenantSlug}/contacts/${contact.id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to convert lead");
    } finally {
      setConverting(false);
    }
  }

  async function handleConvertToCompany() {
    if (!lead) return;
    if (!lead.company?.trim() && !confirm("This lead has no company name. Create a company anyway?")) return;
    setConverting(true);
    setActionError(null);
    try {
      const company = await createCompany(tenantSlug, {
        company_name: lead.company?.trim() || `${formatLeadName(lead)} (Company)`,
        email: lead.email,
        phone: lead.phone,
        owner_id: lead.assigned_to_id,
        description: `Created from lead: ${formatLeadName(lead)}`,
      });
      router.push(`/${tenantSlug}/companies/${company.id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to create company");
    } finally {
      setConverting(false);
    }
  }

  async function handleSaveNotes() {
    if (!lead) return;
    setSavingNotes(true);
    setActionError(null);
    try {
      const updated = await updateLead(tenantSlug, lead.id, { notes: notesDraft.trim() || null });
      setLead(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to save notes");
      throw err;
    } finally {
      setSavingNotes(false);
    }
  }

  if (loading) {
    return <p className="text-zinc-500">Loading lead...</p>;
  }

  if (error || !lead || !meta) {
    return (
      <div className="space-y-4">
        <Link href={`/${tenantSlug}/leads`} className="inline-flex items-center gap-2 text-sm text-zinc-500">
          <ArrowLeft className="h-4 w-4" />
          Back to leads
        </Link>
        <p className="text-red-600">{error ?? "Lead not found"}</p>
      </div>
    );
  }

  const score = getLeadScore(lead);
  const isConverted = lead.status === "converted";

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1 space-y-6">
        <div className="space-y-2">
          <Link
            href={`/${tenantSlug}/leads`}
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to leads
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold">{formatLeadName(lead)}</h2>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                STATUS_COLORS[lead.status] ?? STATUS_COLORS.new,
              )}
            >
              {STATUS_LABELS[lead.status] ?? lead.status}
            </span>
          </div>
          <p className="text-zinc-500">{lead.job_title ?? lead.company ?? "Lead"}</p>
        </div>

        {actionError && <p className="text-sm text-red-600">{actionError}</p>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Lead information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-zinc-500">Email</p>
                <p>{lead.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-zinc-500">Phone</p>
                <p>{lead.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-zinc-500">Job title</p>
                <p>{lead.job_title ?? "—"}</p>
              </div>
              <div>
                <p className="text-zinc-500">Estimated value</p>
                <p>{formatCurrency(lead.estimated_value)}</p>
              </div>
              <div>
                <p className="text-zinc-500">Created</p>
                <p>{formatDate(lead.created_at)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Company</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>{lead.company ?? "—"}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Assigned user</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {lead.assigned_to ? (
                <div>
                  <p className="font-medium">{lead.assigned_to.full_name}</p>
                  <p className="text-zinc-500">{lead.assigned_to.email}</p>
                </div>
              ) : (
                <p className="text-zinc-500">Unassigned</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Status & source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-zinc-500">Status</p>
                <p>{STATUS_LABELS[lead.status] ?? lead.status}</p>
              </div>
              <div>
                <p className="text-zinc-500">Source</p>
                <p>{lead.source ? (SOURCE_LABELS[lead.source] ?? lead.source) : "—"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Score</CardTitle>
            </CardHeader>
            <CardContent>
              <ScoreRing score={score} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Contact details</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {linkedContact ? (
                <Link
                  href={`/${tenantSlug}/contacts/${linkedContact.id}`}
                  className="font-medium text-[var(--primary)] hover:underline"
                >
                  {linkedContact.first_name} {linkedContact.last_name}
                </Link>
              ) : isConverted ? (
                <p className="text-zinc-500">Contact record not found</p>
              ) : (
                <p className="text-zinc-500">Not converted yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {lead.notes && (
          <EntityNotesPreview
            notes={lead.notes}
            onEdit={canWrite("lead") ? () => setActiveTab("Notes") : undefined}
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
              {tab === "Deals" && deals.length > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {deals.length}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {activeTab === "Activities" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Activities</CardTitle>
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
                entityType="lead"
                entityId={lead.id}
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
              <EntityTasksPanel tenantSlug={tenantSlug} entityType="lead" entityId={lead.id} />
            </CardContent>
          </Card>
        )}

        {activeTab === "Deals" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Deals ({deals.length})</CardTitle>
              {canWrite("deal") && (
                <Button size="sm" onClick={() => setDealFormOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Create deal
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {deals.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-500">No deals linked to this lead.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-left">
                        <th className="px-4 py-3 font-medium">Title</th>
                        <th className="px-4 py-3 font-medium">Stage</th>
                        <th className="px-4 py-3 font-medium">Value</th>
                        <th className="px-4 py-3 font-medium">Owner</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deals.map((deal) => (
                        <tr key={deal.id} className="border-b border-[var(--border)]/70">
                          <td className="px-4 py-3">
                            <Link
                              href={`/${tenantSlug}/deals/${deal.id}`}
                              className="font-medium hover:underline"
                            >
                              {deal.title}
                            </Link>
                          </td>
                          <td className="px-4 py-3 capitalize">{deal.stage.replace("_", " ")}</td>
                          <td className="px-4 py-3">
                            {formatDealCurrency(deal.value, deal.currency)}
                          </td>
                          <td className="px-4 py-3">{deal.assigned_to?.full_name ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "Emails" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Emails</CardTitle>
            </CardHeader>
            <CardContent>
              <EntityEmailsPanel
                tenantSlug={tenantSlug}
                entityType="lead"
                entityId={lead.id}
                canWrite={canWrite("email")}
                embedded
              />
            </CardContent>
          </Card>
        )}

        {activeTab === "Timeline" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Full timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline
                tenantSlug={tenantSlug}
                entityType="lead"
                entityId={lead.id}
                pageSize={50}
                refreshKey={refreshKey}
              />
            </CardContent>
          </Card>
        )}

        {activeTab === "Notes" && (
          <EntityNotesPanel
            value={notesDraft}
            onChange={setNotesDraft}
            onSave={handleSaveNotes}
            saving={savingNotes}
            readOnly={!canWrite("lead")}
            placeholder="Add notes about this lead — discovery calls, objections, next steps..."
            description="Team-visible notes attached to this lead record."
          />
        )}
      </div>

      <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-72">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {canWrite("lead") && (
              <Button variant="outline" className="justify-start" onClick={() => setLeadFormOpen(true)}>
                <Pencil className="h-4 w-4" />
                Edit lead
              </Button>
            )}
            {canDelete("lead") && (
              <Button
                variant="outline"
                className="justify-start text-red-600 hover:text-red-700"
                onClick={() => void handleDelete()}
              >
                <Trash2 className="h-4 w-4" />
                Delete lead
              </Button>
            )}
            {(canWrite("lead") || canDelete("lead")) && <hr className="my-1 border-[var(--border)]" />}
            {canWrite("contact") && canWrite("lead") && (
              <Button
                variant="outline"
                className="justify-start"
                disabled={isConverted || converting}
                onClick={() => void handleConvertToContact()}
              >
                <UserPlus className="h-4 w-4" />
                {converting ? "Converting..." : "Convert to contact"}
              </Button>
            )}
            {canWrite("company") && canWrite("lead") && (
              <Button
                variant="outline"
                className="justify-start"
                disabled={converting}
                onClick={() => void handleConvertToCompany()}
              >
                <Building2 className="h-4 w-4" />
                Convert to company
              </Button>
            )}
            {canWrite("deal") && (
              <Button variant="outline" className="justify-start" onClick={() => setDealFormOpen(true)}>
                <Briefcase className="h-4 w-4" />
                Create deal
              </Button>
            )}
            {canWrite("task") && (
              <Button variant="outline" className="justify-start" onClick={() => setTaskFormOpen(true)}>
                <ListTodo className="h-4 w-4" />
                Create task
              </Button>
            )}
            {linkedContact && (
              <Link href={`/${tenantSlug}/contacts/${linkedContact.id}`}>
                <Button variant="ghost" className="w-full justify-start">
                  <ArrowRightLeft className="h-4 w-4" />
                  View contact
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </aside>

      <LeadFormDialog
        open={leadFormOpen}
        meta={meta}
        members={members}
        initial={lead}
        onClose={() => setLeadFormOpen(false)}
        onSubmit={async (data) => {
          const updated = await updateLead(tenantSlug, lead.id, data);
          setLead(updated);
          setNotesDraft(updated.notes ?? "");
        }}
      />

      <ActivityFormDialog
        open={activityFormOpen}
        tenantSlug={tenantSlug}
        defaultEntityType="lead"
        defaultEntityId={lead.id}
        lockEntity
        onClose={() => setActivityFormOpen(false)}
        onSubmit={async (data) => {
          await createActivity(tenantSlug, data);
          setRefreshKey((k) => k + 1);
        }}
      />

      <DealFormDialog
        tenantSlug={tenantSlug}
        open={dealFormOpen}
        stages={dealStages}
        members={members}
        defaultLeadId={lead.id}
        defaultStage="new"
        onClose={() => setDealFormOpen(false)}
        onSubmit={async (data) => {
          await createDeal(tenantSlug, data);
          await loadRelated();
          setActiveTab("Deals");
        }}
      />

      <TaskFormDialog
        open={taskFormOpen}
        members={members}
        defaultEntityType="lead"
        defaultEntityId={lead.id}
        lockEntity
        onClose={() => setTaskFormOpen(false)}
        onSubmit={async (data) => {
          await createTask(tenantSlug, data);
          setActiveTab("Tasks");
        }}
      />
    </div>
  );
}
