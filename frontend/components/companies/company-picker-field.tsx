"use client";

import { useEffect, useState } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { listCompanies } from "@/lib/api/companies";
import type { Company } from "@/types/api";

const selectClassName =
  "flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)]";

interface CompanyPickerFieldProps {
  tenantSlug: string;
  open: boolean;
  label?: string;
  registration: UseFormRegisterReturn;
  onCompaniesLoaded?: (companies: Company[]) => void;
}

export function CompanyPickerField({
  tenantSlug,
  open,
  label = "Company",
  registration,
  onCompaniesLoaded,
}: CompanyPickerFieldProps) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);

    void listCompanies(tenantSlug, {
      page_size: 100,
      sort_by: "company_name",
      sort_order: "asc",
    })
      .then((data) => {
        if (cancelled) return;
        setCompanies(data.items);
        onCompaniesLoaded?.(data.items);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantSlug, open, onCompaniesLoaded]);

  return (
    <div className="space-y-2">
      <Label htmlFor={registration.name}>{label}</Label>
      <select
        id={registration.name}
        className={selectClassName}
        disabled={loading}
        {...registration}
      >
        <option value="">{loading ? "Loading companies..." : "No company linked"}</option>
        {companies.map((company) => (
          <option key={company.id} value={company.id}>
            {company.company_name}
            {company.company_code ? ` (${company.company_code})` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
