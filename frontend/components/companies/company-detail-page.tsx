"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { ActivityFormDialog } from "@/components/activities/activity-form-dialog";
import { ActivityTimeline } from "@/components/activities/activity-timeline";
import { CompanyFormDialog } from "@/components/companies/company-form-dialog";
import { EntityEmailsPanel } from "@/components/emails/entity-emails-panel";
import { EntityTasksPanel } from "@/components/tasks/entity-tasks-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermissions } from "@/contexts/permissions-context";
import { createActivity } from "@/lib/api/activities";
import {
  deleteCompany,
  formatCompanyLocation,
  formatCurrency,
  formatDate,
  getCompany,
  getCompanyMeta,
  INDUSTRY_LABELS,
  listCompanyDeals,
  updateCompany,
} from "@/lib/api/companies";
import { formatContactName, listContacts } from "@/lib/api/contacts";
import { listMembers } from "@/lib/api/tenants";
import { cn } from "@/lib/utils";
import type { Company, Contact, Deal, Member } from "@/types/api";

const TABS = ["Overview", "Contacts", "Deals", "Activity", "Tasks", "Emails"] as const;
type Tab = (typeof TABS)[number];

interface CompanyDetailPageProps {
  tenantSlug: string;
  companyId: string;
}

export function CompanyDetailPage({ tenantSlug, companyId }: CompanyDetailPageProps) {
  const router = useRouter();
  const { canWrite, canDelete } = usePermissions();
  const [company, setCompany] = useState<Company | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  async function loadCompany() {
    setLoading(true);
    setError(null);
    try {
      const data = await getCompany(tenantSlug, companyId);
      setCompany(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load company");
    } finally {
      setLoading(false);
    }
  }

  async function loadRelated() {
    try {
      const [contactData, dealData] = await Promise.all([
        listContacts(tenantSlug, { company_id: companyId, page_size: 50 }),
        listCompanyDeals(tenantSlug, companyId),
      ]);
      setContacts(contactData.items);
      setDeals(dealData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load related records");
    }
  }

  useEffect(() => {
    void loadCompany();
    void loadRelated();
    void Promise.all([listMembers(tenantSlug), getCompanyMeta(tenantSlug)]).then(
      ([memberList, meta]) => {
        setMembers(memberList);
        setIndustries(meta.industries);
      },
    );
  }, [tenantSlug, companyId]);

  async function handleDelete() {
    if (!company || !confirm(`Delete company "${company.company_name}"?`)) return;
    try {
      await deleteCompany(tenantSlug, company.id);
      router.push(`/${tenantSlug}/companies`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete company");
    }
  }

  if (loading) {
    return <p className="text-zinc-500">Loading company...</p>;
  }

  if (error || !company) {
    return (
      <div className="space-y-4">
        <Link
          href={`/${tenantSlug}/companies`}
          className="inline-flex items-center gap-2 text-sm text-zinc-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to companies
        </Link>
        <p className="text-red-600">{error ?? "Company not found"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href={`/${tenantSlug}/companies`}
            className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to companies
          </Link>
          <h2 className="text-2xl font-semibold">{company.company_name}</h2>
          <p className="text-zinc-500">
            {company.industry ? (INDUSTRY_LABELS[company.industry] ?? company.industry) : "Company"}
            {company.company_code ? ` · ${company.company_code}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "Activity" && canWrite("activity") && (
            <Button onClick={() => setActivityFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Log activity
            </Button>
          )}
          {canWrite("company") && (
            <Button variant="outline" onClick={() => setFormOpen(true)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          )}
          {canDelete("company") && (
            <Button variant="outline" onClick={() => void handleDelete()}>
              <Trash2 className="h-4 w-4 text-red-600" />
              Delete
            </Button>
          )}
        </div>
      </div>

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
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-zinc-500">Website</p>
                <p>
                  {company.website ? (
                    <a
                      href={company.website.startsWith("http") ? company.website : `https://${company.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--primary)] hover:underline"
                    >
                      {company.website}
                    </a>
                  ) : (
                    "—"
                  )}
                </p>
              </div>
              <div>
                <p className="text-zinc-500">Email</p>
                <p>{company.email ?? "—"}</p>
              </div>
              <div>
                <p className="text-zinc-500">Phone</p>
                <p>{company.phone ?? "—"}</p>
              </div>
              <div>
                <p className="text-zinc-500">Annual revenue</p>
                <p>{formatCurrency(company.annual_revenue)}</p>
              </div>
              <div>
                <p className="text-zinc-500">Employees</p>
                <p>{company.employee_count ?? "—"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-zinc-500">Street</p>
                <p>{company.address ?? "—"}</p>
              </div>
              <div>
                <p className="text-zinc-500">Location</p>
                <p>{formatCompanyLocation(company)}</p>
              </div>
              <div>
                <p className="text-zinc-500">Postal code</p>
                <p>{company.postal_code ?? "—"}</p>
              </div>
              <div>
                <p className="text-zinc-500">Created</p>
                <p>{formatDate(company.created_at)}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Owner</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {company.owner ? (
                <div>
                  <p className="font-medium">{company.owner.full_name}</p>
                  <p className="text-zinc-500">{company.owner.email}</p>
                </div>
              ) : (
                <p className="text-zinc-500">Unassigned</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Description</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="whitespace-pre-wrap">{company.description ?? "No description provided."}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "Contacts" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linked contacts ({contacts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-500">No contacts linked to this company.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-left">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact) => (
                      <tr key={contact.id} className="border-b border-[var(--border)]/70">
                        <td className="px-4 py-3">
                          <Link
                            href={`/${tenantSlug}/contacts/${contact.id}`}
                            className="font-medium hover:underline"
                          >
                            {formatContactName(contact)}
                          </Link>
                        </td>
                        <td className="px-4 py-3">{contact.email ?? "—"}</td>
                        <td className="px-4 py-3">{contact.phone ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "Deals" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linked deals ({deals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {deals.length === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-500">No deals linked to this company.</p>
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
                          {deal.value
                            ? new Intl.NumberFormat("en-US", {
                                style: "currency",
                                currency: deal.currency,
                              }).format(Number(deal.value))
                            : "—"}
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

      {activeTab === "Activity" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityTimeline
              tenantSlug={tenantSlug}
              entityType="company"
              entityId={company.id}
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
            <EntityTasksPanel tenantSlug={tenantSlug} entityType="company" entityId={company.id} />
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
              entityType="company"
              entityId={company.id}
              canWrite={canWrite("email")}
              embedded
            />
          </CardContent>
        </Card>
      )}

      <ActivityFormDialog
        open={activityFormOpen}
        tenantSlug={tenantSlug}
        defaultEntityType="company"
        defaultEntityId={company.id}
        lockEntity
        onClose={() => setActivityFormOpen(false)}
        onSubmit={async (data) => {
          await createActivity(tenantSlug, data);
          setRefreshKey((k) => k + 1);
        }}
      />

      <CompanyFormDialog
        open={formOpen}
        members={members}
        industries={industries}
        initial={company}
        onClose={() => setFormOpen(false)}
        onSubmit={async (data) => {
          await updateCompany(tenantSlug, company.id, data);
          await loadCompany();
        }}
      />
    </div>
  );
}
