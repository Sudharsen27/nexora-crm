"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { INDUSTRY_LABELS, type CompanyInput } from "@/lib/api/companies";
import type { Company, Member } from "@/types/api";

const schema = z.object({
  company_name: z.string().min(1, "Company name is required").max(255),
  company_code: z.string().max(50).optional(),
  industry: z.string().optional(),
  website: z.string().max(500).optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  annual_revenue: z.string().optional(),
  employee_count: z.string().optional(),
  owner_id: z.string().optional(),
  description: z.string().max(10000).optional(),
});

type FormData = z.infer<typeof schema>;

interface CompanyFormDialogProps {
  open: boolean;
  members: Member[];
  industries: string[];
  initial?: Company | null;
  onClose: () => void;
  onSubmit: (data: CompanyInput) => Promise<void>;
}

function toFormValues(company: Company | null | undefined): FormData {
  if (!company) {
    return {
      company_name: "",
      company_code: "",
      industry: "",
      website: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      state: "",
      country: "",
      postal_code: "",
      annual_revenue: "",
      employee_count: "",
      owner_id: "",
      description: "",
    };
  }
  return {
    company_name: company.company_name,
    company_code: company.company_code ?? "",
    industry: company.industry ?? "",
    website: company.website ?? "",
    email: company.email ?? "",
    phone: company.phone ?? "",
    address: company.address ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    country: company.country ?? "",
    postal_code: company.postal_code ?? "",
    annual_revenue: company.annual_revenue ?? "",
    employee_count: company.employee_count != null ? String(company.employee_count) : "",
    owner_id: company.owner_id ?? "",
    description: company.description ?? "",
  };
}

export function CompanyFormDialog({
  open,
  members,
  industries,
  initial,
  onClose,
  onSubmit,
}: CompanyFormDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const isEdit = Boolean(initial);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: toFormValues(initial),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          {isEdit ? "Edit company" : "New company"}
        </h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={handleSubmit(async (data) => {
            setError(null);
            try {
              const revenue = data.annual_revenue?.trim();
              const employees = data.employee_count?.trim();
              await onSubmit({
                company_name: data.company_name.trim(),
                company_code: data.company_code?.trim() || null,
                industry: data.industry?.trim() || null,
                website: data.website?.trim() || null,
                email: data.email?.trim() || null,
                phone: data.phone?.trim() || null,
                address: data.address?.trim() || null,
                city: data.city?.trim() || null,
                state: data.state?.trim() || null,
                country: data.country?.trim() || null,
                postal_code: data.postal_code?.trim() || null,
                annual_revenue: revenue ? Number(revenue) : null,
                employee_count: employees ? Number(employees) : null,
                owner_id: data.owner_id || null,
                description: data.description?.trim() || null,
              });
              onClose();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Failed to save company");
            }
          })}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="company_name">Company name *</Label>
              <Input id="company_name" {...register("company_name")} />
              {errors.company_name && (
                <p className="text-sm text-red-600">{errors.company_name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_code">Company code</Label>
              <Input id="company_code" {...register("company_code")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <select
                id="industry"
                className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                {...register("industry")}
              >
                <option value="">Select industry</option>
                {industries.map((industry) => (
                  <option key={industry} value={industry}>
                    {INDUSTRY_LABELS[industry] ?? industry}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input id="website" type="url" placeholder="https://" {...register("website")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register("address")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register("city")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" {...register("state")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...register("country")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postal_code">Postal code</Label>
              <Input id="postal_code" {...register("postal_code")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="annual_revenue">Annual revenue</Label>
              <Input id="annual_revenue" type="number" min="0" step="0.01" {...register("annual_revenue")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee_count">Employee count</Label>
              <Input id="employee_count" type="number" min="0" {...register("employee_count")} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="owner_id">Owner</Label>
              <select
                id="owner_id"
                className="flex h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                {...register("owner_id")}
              >
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                rows={4}
                className="flex w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                {...register("description")}
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Create company"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
