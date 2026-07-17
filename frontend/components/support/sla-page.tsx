"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Clock, Plus, Trash2 } from "lucide-react";
import { SupportNavTabs } from "@/components/support/support-nav-tabs";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useSlaPolicies } from "@/hooks/use-support";
import { usePermissions } from "@/contexts/permissions-context";
import {
  checkEscalations,
  createSlaPolicy,
  deleteSlaPolicy,
  formatMinutes,
  PRIORITY_LABELS,
  TICKET_PRIORITIES,
  updateSlaPolicy,
} from "@/lib/api/support";
import type { SlaPolicy } from "@/types/support";

const schema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().optional(),
  priority: z.enum(TICKET_PRIORITIES),
  response_minutes: z.number().min(1),
  resolution_minutes: z.number().min(1),
  escalation_minutes: z.number().min(1),
  escalate_to_level: z.string().min(1),
  is_active: z.boolean().optional(),
  is_default: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

interface SlaPageProps {
  tenantSlug: string;
}

export function SlaPage({ tenantSlug }: SlaPageProps) {
  const { data, loading, error, refresh } = useSlaPolicies(tenantSlug);
  const { canWrite, canDelete, loading: permLoading } = usePermissions();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SlaPolicy | null>(null);
  const [checkResult, setCheckResult] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: editing
      ? {
          name: editing.name,
          description: editing.description ?? "",
          priority: editing.priority as FormData["priority"],
          response_minutes: editing.response_minutes,
          resolution_minutes: editing.resolution_minutes,
          escalation_minutes: editing.escalation_minutes,
          escalate_to_level: editing.escalate_to_level,
          is_active: editing.is_active,
          is_default: editing.is_default,
        }
      : {
          name: "",
          description: "",
          priority: "medium",
          response_minutes: 60,
          resolution_minutes: 480,
          escalation_minutes: 240,
          escalate_to_level: "level_2",
          is_active: true,
          is_default: false,
        },
  });

  if (loading && !data) return <WidgetSkeleton variant="chart" />;
  if (error) return <WidgetError title="SLA Policies" message={error} onRetry={() => void refresh()} />;

  const policies = data?.items ?? [];

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="h-6 w-6 text-violet-500" />
            <h1 className="text-2xl font-bold">SLA Policies</h1>
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Response, resolution, and escalation targets</p>
        </div>
        <div className="flex gap-2">
          {!permLoading && canWrite("support") && (
            <>
              <Button
                variant="outline"
                disabled={checking}
                onClick={() => {
                  setChecking(true);
                  void checkEscalations(tenantSlug)
                    .then((r) => setCheckResult(`Escalated: ${r.escalated}, Overdue: ${r.overdue}`))
                    .catch((err) => setCheckResult(err instanceof Error ? err.message : "Check failed"))
                    .finally(() => setChecking(false));
                }}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Check Escalations
              </Button>
              <Button
                className="bg-violet-600 hover:bg-violet-700"
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                New Policy
              </Button>
            </>
          )}
        </div>
      </div>

      <SupportNavTabs tenantSlug={tenantSlug} />

      {checkResult && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-sm">{checkResult}</div>
      )}

      <Card className="border-[var(--border)]/80 bg-[var(--surface)]/80 backdrop-blur-sm">
        <CardContent className="p-0">
          {policies.length === 0 ? (
            <p className="p-8 text-center text-[var(--muted-foreground)]">No SLA policies configured</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Priority</th>
                  <th className="px-4 py-3 font-medium">Response</th>
                  <th className="px-4 py-3 font-medium">Resolution</th>
                  <th className="px-4 py-3 font-medium">Escalation</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {policies.map((policy) => (
                  <tr key={policy.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--surface-muted)]/50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{policy.name}</p>
                      {policy.description && (
                        <p className="text-xs text-[var(--muted-foreground)]">{policy.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">{PRIORITY_LABELS[policy.priority] ?? policy.priority}</td>
                    <td className="px-4 py-3">{formatMinutes(policy.response_minutes)}</td>
                    <td className="px-4 py-3">{formatMinutes(policy.resolution_minutes)}</td>
                    <td className="px-4 py-3">{formatMinutes(policy.escalation_minutes)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={policy.is_active ? "default" : "outline"}>
                        {policy.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {policy.is_default && (
                        <Badge variant="outline" className="ml-1">Default</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {!permLoading && canWrite("support") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditing(policy);
                              setFormOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        )}
                        {!permLoading && canDelete("support") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void deleteSlaPolicy(tenantSlug, policy.id).then(() => refresh())}
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
          )}
        </CardContent>
      </Card>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
            <h2 className="text-lg font-semibold">{editing ? "Edit SLA Policy" : "New SLA Policy"}</h2>
            <form
              className="mt-4 space-y-4"
              onSubmit={handleSubmit(async (formData) => {
                const payload = {
                  name: formData.name.trim(),
                  description: formData.description?.trim() || null,
                  priority: formData.priority,
                  response_minutes: formData.response_minutes,
                  resolution_minutes: formData.resolution_minutes,
                  escalation_minutes: formData.escalation_minutes,
                  escalate_to_level: formData.escalate_to_level,
                  is_active: formData.is_active ?? true,
                  is_default: formData.is_default ?? false,
                };
                if (editing) {
                  await updateSlaPolicy(tenantSlug, editing.id, payload);
                } else {
                  await createSlaPolicy(tenantSlug, payload);
                }
                setFormOpen(false);
                setEditing(null);
                reset();
                await refresh();
              })}
            >
              <div>
                <Label>Name</Label>
                <Input {...register("name")} className="mt-1" />
              </div>
              <div>
                <Label>Description</Label>
                <Input {...register("description")} className="mt-1" />
              </div>
              <div>
                <Label>Priority</Label>
                <select
                  className="mt-1 h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
                  {...register("priority")}
                >
                  {TICKET_PRIORITIES.map((p) => (
                    <option key={p} value={p}>{PRIORITY_LABELS[p]}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Response (min)</Label>
                  <Input type="number" {...register("response_minutes", { valueAsNumber: true })} className="mt-1" />
                </div>
                <div>
                  <Label>Resolution (min)</Label>
                  <Input type="number" {...register("resolution_minutes", { valueAsNumber: true })} className="mt-1" />
                </div>
                <div>
                  <Label>Escalation (min)</Label>
                  <Input type="number" {...register("escalation_minutes", { valueAsNumber: true })} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Escalate to level</Label>
                <Input {...register("escalate_to_level")} className="mt-1" placeholder="level_2" />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...register("is_active")} />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" {...register("is_default")} />
                  Default
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="bg-violet-600 hover:bg-violet-700">
                  Save
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
