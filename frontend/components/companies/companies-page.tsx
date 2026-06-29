"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { CompanyFormDialog } from "@/components/companies/company-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/contexts/permissions-context";
import {
  createCompany,
  deleteCompany,
  formatCompanyLocation,
  formatCurrency,
  formatDate,
  getCompanyMeta,
  INDUSTRY_LABELS,
  listCompanies,
  updateCompany,
} from "@/lib/api/companies";
import { listMembers } from "@/lib/api/tenants";
import type { Company, Member } from "@/types/api";

interface CompaniesPageProps {
  tenantSlug: string;
}

export function CompaniesPage({ tenantSlug }: CompaniesPageProps) {
  const router = useRouter();
  const { canWrite, canDelete } = usePermissions();
  const searchParams = useSearchParams();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [industries, setIndustries] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);

  const q = searchParams.get("q") ?? "";
  const industry = searchParams.get("industry") ?? "";
  const ownerId = searchParams.get("owner_id") ?? "";
  const city = searchParams.get("city") ?? "";
  const country = searchParams.get("country") ?? "";
  const page = Number(searchParams.get("page") ?? "1");
  const sortBy = searchParams.get("sort_by") ?? "created_at";
  const sortOrder = (searchParams.get("sort_order") ?? "desc") as "asc" | "desc";

  const [searchInput, setSearchInput] = useState(q);
  const [cityInput, setCityInput] = useState(city);
  const [countryInput, setCountryInput] = useState(country);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      });
      router.push(`/${tenantSlug}/companies?${params.toString()}`);
    },
    [router, searchParams, tenantSlug],
  );

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCompanies(tenantSlug, {
        q: q || undefined,
        industry: industry || undefined,
        owner_id: ownerId || undefined,
        city: city || undefined,
        country: country || undefined,
        page,
        page_size: 10,
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      setCompanies(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load companies");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, q, industry, ownerId, city, country, page, sortBy, sortOrder]);

  useEffect(() => {
    void Promise.all([listMembers(tenantSlug), getCompanyMeta(tenantSlug)]).then(
      ([memberList, meta]) => {
        setMembers(memberList);
        setIndustries(meta.industries);
      },
    );
  }, [tenantSlug]);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    setSearchInput(q);
    setCityInput(city);
    setCountryInput(country);
  }, [q, city, country]);

  async function handleDelete(company: Company) {
    if (!confirm(`Delete company "${company.company_name}"?`)) return;
    try {
      await deleteCompany(tenantSlug, company.id);
      await loadCompanies();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete company");
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
          <h2 className="text-2xl font-semibold">Companies</h2>
          <p className="text-zinc-500">
            {total} compan{total !== 1 ? "ies" : "y"} total
          </p>
        </div>
        {canWrite("company") && (
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New company
          </Button>
        )}
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
                city: cityInput.trim() || null,
                country: countryInput.trim() || null,
                page: "1",
              });
            }}
          >
            <div className="relative sm:col-span-2 xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="pl-9"
                placeholder="Search name, code, email, location..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <select
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              value={industry}
              onChange={(e) => updateParams({ industry: e.target.value || null, page: "1" })}
            >
              <option value="">All industries</option>
              {industries.map((item) => (
                <option key={item} value={item}>
                  {INDUSTRY_LABELS[item] ?? item}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              value={ownerId}
              onChange={(e) => updateParams({ owner_id: e.target.value || null, page: "1" })}
            >
              <option value="">All owners</option>
              {members.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.full_name}
                </option>
              ))}
            </select>
            <Input
              placeholder="City"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
            />
            <Input
              placeholder="Country"
              value={countryInput}
              onChange={(e) => setCountryInput(e.target.value)}
            />
            <Button type="submit">Search</Button>
            {(q || industry || ownerId || city || country) && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchInput("");
                  setCityInput("");
                  setCountryInput("");
                  router.push(`/${tenantSlug}/companies`);
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
          ) : companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <p className="text-base font-medium text-[var(--foreground)]">No companies found</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">Create your first company.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left">
                    <th className="px-4 py-3 font-medium">
                      <button type="button" onClick={() => toggleSort("company_name")}>
                        Company
                      </button>
                    </th>
                    <th className="px-4 py-3 font-medium">
                      <button type="button" onClick={() => toggleSort("industry")}>
                        Industry
                      </button>
                    </th>
                    <th className="px-4 py-3 font-medium">Location</th>
                    <th className="px-4 py-3 font-medium">Owner</th>
                    <th className="px-4 py-3 font-medium">
                      <button type="button" onClick={() => toggleSort("annual_revenue")}>
                        Revenue
                      </button>
                    </th>
                    <th className="px-4 py-3 font-medium">
                      <button type="button" onClick={() => toggleSort("created_at")}>
                        Created
                      </button>
                    </th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((company) => (
                    <tr
                      key={company.id}
                      className="border-b border-[var(--border)]/70 transition-colors hover:bg-[var(--surface-muted)]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/${tenantSlug}/companies/${company.id}`}
                          className="font-medium hover:underline"
                        >
                          {company.company_name}
                        </Link>
                        {company.company_code && (
                          <p className="text-xs text-zinc-500">{company.company_code}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {company.industry ? (INDUSTRY_LABELS[company.industry] ?? company.industry) : "—"}
                      </td>
                      <td className="px-4 py-3">{formatCompanyLocation(company)}</td>
                      <td className="px-4 py-3">{company.owner?.full_name ?? "—"}</td>
                      <td className="px-4 py-3">{formatCurrency(company.annual_revenue)}</td>
                      <td className="px-4 py-3">{formatDate(company.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {canWrite("company") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditing(company);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete("company") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleDelete(company)}
                              aria-label={`Delete ${company.company_name}`}
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

      <CompanyFormDialog
        open={formOpen}
        members={members}
        industries={industries}
        initial={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={async (data) => {
          if (editing) {
            await updateCompany(tenantSlug, editing.id, data);
          } else {
            await createCompany(tenantSlug, data);
          }
          await loadCompanies();
        }}
      />
    </div>
  );
}
