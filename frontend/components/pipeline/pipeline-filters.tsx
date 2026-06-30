"use client";

import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { DealPipelineFilters, DealStageMeta, Member } from "@/types/api";
import type { Company } from "@/types/api";

interface PipelineFiltersProps {
  filters: DealPipelineFilters;
  stages: DealStageMeta[];
  members: Member[];
  companies: Company[];
  onChange: (filters: DealPipelineFilters) => void;
}

export function PipelineFiltersBar({
  filters,
  stages,
  members,
  companies,
  onChange,
}: PipelineFiltersProps) {
  const hasFilters = Boolean(
    filters.q ||
      filters.owner_id ||
      filters.company_id ||
      filters.stage ||
      filters.close_date_from ||
      filters.close_date_to ||
      filters.value_min != null ||
      filters.value_max != null,
  );

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <Input
          placeholder="Search deals..."
          className="pl-9"
          value={filters.q ?? ""}
          onChange={(e) => onChange({ ...filters, q: e.target.value || undefined })}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <select
          className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
          value={filters.owner_id ?? ""}
          onChange={(e) => onChange({ ...filters, owner_id: e.target.value || undefined })}
        >
          <option value="">All owners</option>
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>
              {m.full_name}
            </option>
          ))}
        </select>
        <select
          className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
          value={filters.company_id ?? ""}
          onChange={(e) => onChange({ ...filters, company_id: e.target.value || undefined })}
        >
          <option value="">All companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company_name}
            </option>
          ))}
        </select>
        <select
          className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
          value={filters.stage ?? ""}
          onChange={(e) => onChange({ ...filters, stage: e.target.value || undefined })}
        >
          <option value="">All stages</option>
          {stages.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.label}
            </option>
          ))}
        </select>
        <Input
          type="date"
          placeholder="Close from"
          value={filters.close_date_from ?? ""}
          onChange={(e) => onChange({ ...filters, close_date_from: e.target.value || undefined })}
        />
        <Input
          type="date"
          placeholder="Close to"
          value={filters.close_date_to ?? ""}
          onChange={(e) => onChange({ ...filters, close_date_to: e.target.value || undefined })}
        />
        <div className="flex gap-2">
          <Input
            type="number"
            min="0"
            placeholder="Min $"
            value={filters.value_min ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                value_min: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
          <Input
            type="number"
            min="0"
            placeholder="Max $"
            value={filters.value_max ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                value_max: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
      </div>
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => onChange({})}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
