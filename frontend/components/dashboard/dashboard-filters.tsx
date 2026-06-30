"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { ANALYTICS_RANGE_LABELS } from "@/lib/api/analytics";
import { DASHBOARD_SCOPE_LABELS } from "@/lib/api/dashboard";
import { listMembers } from "@/lib/api/tenants";
import type { AnalyticsRange } from "@/types/analytics";
import type { DashboardScope } from "@/types/dashboard";
import type { Member } from "@/types/api";

interface DashboardFiltersProps {
  tenantSlug: string;
}

const RANGE_OPTIONS: AnalyticsRange[] = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "last_7_days",
  "last_30_days",
  "this_month",
  "last_month",
  "this_quarter",
  "this_year",
];

export function DashboardFilters({ tenantSlug }: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const range = (searchParams.get("range") as AnalyticsRange) || "last_30_days";
  const scope = (searchParams.get("scope") as DashboardScope) || "my";
  const ownerId = searchParams.get("owner_id") ?? "";
  const startDate = searchParams.get("start_date") ?? "";
  const endDate = searchParams.get("end_date") ?? "";
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    void listMembers(tenantSlug).then(setMembers);
  }, [tenantSlug]);

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    });
    router.push(`/${tenantSlug}?${params.toString()}`);
  }

  return (
    <div
      className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end"
      role="group"
      aria-label="Dashboard filters"
    >
      <div className="min-w-[160px] flex-1 sm:max-w-[200px]">
        <Label htmlFor="dashboard-range" className="mb-1.5 block text-xs font-medium">
          Date range
        </Label>
        <Select
          id="dashboard-range"
          value={range}
          onChange={(e) => updateParams({ range: e.target.value, start_date: null, end_date: null })}
          aria-label="Date range"
        >
          {RANGE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {ANALYTICS_RANGE_LABELS[option]}
            </option>
          ))}
          <option value="custom">Custom range</option>
        </Select>
      </div>

      {range === "custom" ? (
        <>
          <div className="min-w-[140px] flex-1 sm:max-w-[160px]">
            <Label htmlFor="start-date" className="mb-1.5 block text-xs font-medium">
              From
            </Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => updateParams({ start_date: e.target.value || null, range: "custom" })}
            />
          </div>
          <div className="min-w-[140px] flex-1 sm:max-w-[160px]">
            <Label htmlFor="end-date" className="mb-1.5 block text-xs font-medium">
              To
            </Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => updateParams({ end_date: e.target.value || null, range: "custom" })}
            />
          </div>
        </>
      ) : null}

      <div className="min-w-[140px] flex-1 sm:max-w-[180px]">
        <Label htmlFor="dashboard-scope" className="mb-1.5 block text-xs font-medium">
          View
        </Label>
        <Select
          id="dashboard-scope"
          value={scope}
          onChange={(e) => updateParams({ scope: e.target.value })}
          aria-label="Data scope"
        >
          {(Object.keys(DASHBOARD_SCOPE_LABELS) as DashboardScope[]).map((option) => (
            <option key={option} value={option}>
              {DASHBOARD_SCOPE_LABELS[option]}
            </option>
          ))}
        </Select>
      </div>

      <div className="min-w-[160px] flex-1 sm:max-w-[200px]">
        <Label htmlFor="dashboard-owner" className="mb-1.5 block text-xs font-medium">
          Owner
        </Label>
        <Select
          id="dashboard-owner"
          value={ownerId}
          onChange={(e) => updateParams({ owner_id: e.target.value || null })}
          aria-label="Owner filter"
        >
          <option value="">All owners</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.full_name}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
