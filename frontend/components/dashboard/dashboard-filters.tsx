"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DASHBOARD_RANGE_LABELS, DASHBOARD_SCOPE_LABELS } from "@/lib/api/dashboard";
import type { DashboardRange, DashboardScope } from "@/types/dashboard";

interface DashboardFiltersProps {
  tenantSlug: string;
}

const RANGE_OPTIONS: DashboardRange[] = [
  "today",
  "last_7_days",
  "last_30_days",
  "this_quarter",
  "this_year",
];

export function DashboardFilters({ tenantSlug }: DashboardFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const range = (searchParams.get("range") as DashboardRange) || "last_30_days";
  const scope = (searchParams.get("scope") as DashboardScope) || "my";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.push(`/${tenantSlug}?${params.toString()}`);
  }

  return (
    <div
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
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
          onChange={(e) => updateParam("range", e.target.value)}
          aria-label="Date range"
        >
          {RANGE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {DASHBOARD_RANGE_LABELS[option]}
            </option>
          ))}
        </Select>
      </div>
      <div className="min-w-[140px] flex-1 sm:max-w-[180px]">
        <Label htmlFor="dashboard-scope" className="mb-1.5 block text-xs font-medium">
          View
        </Label>
        <Select
          id="dashboard-scope"
          value={scope}
          onChange={(e) => updateParam("scope", e.target.value)}
          aria-label="Data scope"
        >
          {(Object.keys(DASHBOARD_SCOPE_LABELS) as DashboardScope[]).map((option) => (
            <option key={option} value={option}>
              {DASHBOARD_SCOPE_LABELS[option]}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
