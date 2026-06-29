"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/contexts/permissions-context";
import { ActivityFormDialog } from "@/components/activities/activity-form-dialog";
import { ActivityTimeline } from "@/components/activities/activity-timeline";
import { ACTIVITY_TYPES, createActivity, listActivities } from "@/lib/api/activities";
import type { Activity } from "@/types/api";

interface ActivitiesPageProps {
  tenantSlug: string;
}

export function ActivitiesPage({ tenantSlug }: ActivitiesPageProps) {
  const router = useRouter();
  const { canWrite } = usePermissions();
  const searchParams = useSearchParams();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const q = searchParams.get("q") ?? "";
  const activityType = searchParams.get("activity_type") ?? "";
  const entityType = searchParams.get("entity_type") ?? "";
  const page = Number(searchParams.get("page") ?? "1");

  const [searchInput, setSearchInput] = useState(q);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      });
      router.push(`/${tenantSlug}/activities?${params.toString()}`);
    },
    [router, searchParams, tenantSlug],
  );

  const loadActivities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listActivities(tenantSlug, {
        q: q || undefined,
        activity_type: activityType || undefined,
        entity_type: entityType || undefined,
        page,
        page_size: 20,
      });
      setActivities(data.items);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activities");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, q, activityType, entityType, page]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    setSearchInput(q);
  }, [q]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Activities</h2>
          <p className="text-zinc-500">
            {total} activit{total !== 1 ? "ies" : "y"} total
          </p>
        </div>
        {canWrite("activity") && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Log activity
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search & filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6"
            onSubmit={(e) => {
              e.preventDefault();
              updateParams({ q: searchInput.trim() || null, page: "1" });
            }}
          >
            <div className="relative sm:col-span-2 xl:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                className="pl-9"
                placeholder="Search descriptions..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <select
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              value={activityType}
              onChange={(e) => updateParams({ activity_type: e.target.value || null, page: "1" })}
            >
              <option value="">All types</option>
              {ACTIVITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replace("_", " ")}
                </option>
              ))}
            </select>
            <select
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              value={entityType}
              onChange={(e) => updateParams({ entity_type: e.target.value || null, page: "1" })}
            >
              <option value="">All entities</option>
              <option value="lead">Leads</option>
              <option value="contact">Contacts</option>
              <option value="deal">Deals</option>
            </select>
            <Button type="submit">Search</Button>
            {(q || activityType || entityType) && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSearchInput("");
                  router.push(`/${tenantSlug}/activities`);
                }}
              >
                Clear
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          {loading ? (
            <p className="text-sm text-zinc-500">Loading activities...</p>
          ) : activities.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-500">No activities found.</p>
          ) : (
            <ActivityTimeline
              tenantSlug={tenantSlug}
              activities={activities}
              showDelete
              lockEntityOnEdit={false}
              onChanged={() => void loadActivities()}
            />
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

      <ActivityFormDialog
        open={formOpen}
        tenantSlug={tenantSlug}
        onClose={() => setFormOpen(false)}
        onSubmit={async (data) => {
          await createActivity(tenantSlug, data);
          await loadActivities();
        }}
      />
    </div>
  );
}
