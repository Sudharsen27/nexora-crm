"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, RefreshCw, Search } from "lucide-react";
import { ActivityDrawer } from "@/components/activities/activity-drawer";
import { ActivityFormDialog } from "@/components/activities/activity-form-dialog";
import { EnterpriseTimeline } from "@/components/activities/enterprise-timeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/contexts/permissions-context";
import { useActivities, useActivityPoll } from "@/hooks/use-activities";
import {
  ACTIVITY_CATEGORIES,
  createActivity,
  deleteActivity,
} from "@/lib/api/activities";
import { listMembers } from "@/lib/api/tenants";
import type { Activity, ActivityFilters } from "@/types/api";
import type { Member } from "@/types/api";

interface ActivitiesPageProps {
  tenantSlug: string;
}

export function ActivitiesPage({ tenantSlug }: ActivitiesPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canWrite, canDelete } = usePermissions();
  const [formOpen, setFormOpen] = useState(false);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchInput, setSearchInput] = useState(searchParams.get("q") ?? "");

  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const actorId = searchParams.get("actor_id") ?? "";
  const dateFrom = searchParams.get("date_from") ?? "";
  const dateTo = searchParams.get("date_to") ?? "";

  const filters: ActivityFilters = useMemo(
    () => ({
      q: q || undefined,
      category: category || undefined,
      actor_id: actorId || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page_size: 20,
      sort: "desc",
    }),
    [q, category, actorId, dateFrom, dateTo],
  );

  const { items, total, loading, loadingMore, error, hasMore, loadMore, refresh, prepend, remove } =
    useActivities(tenantSlug, filters);

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

  const handleNewActivities = useCallback(
    (fresh: Activity[]) => {
      fresh.forEach((a) => prepend(a));
    },
    [prepend],
  );

  useActivityPoll(tenantSlug, handleNewActivities, 30000, !loading);

  useEffect(() => {
    void listMembers(tenantSlug).then(setMembers);
  }, [tenantSlug]);

  async function handleDelete(activity: Activity) {
    if (!confirm("Delete this activity?")) return;
    await deleteActivity(tenantSlug, activity.id);
    remove(activity.id);
    if (drawerId === activity.id) setDrawerId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Activity Timeline</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            {total.toLocaleString()} event{total !== 1 ? "s" : ""} · auto-tracked across your CRM
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {canWrite("activity") && (
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Log activity
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {ACTIVITY_CATEGORIES.map((cat) => (
              <Button
                key={cat.value || "all"}
                size="sm"
                variant={category === cat.value ? "default" : "outline"}
                onClick={() => updateParams({ category: cat.value || null })}
              >
                {cat.label}
              </Button>
            ))}
          </div>

          <form
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"
            onSubmit={(e) => {
              e.preventDefault();
              updateParams({ q: searchInput.trim() || null });
            }}
          >
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <Input
                className="pl-9"
                placeholder="Search activities..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <select
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
              value={actorId}
              onChange={(e) => updateParams({ actor_id: e.target.value || null })}
            >
              <option value="">All users</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.full_name}
                </option>
              ))}
            </select>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => updateParams({ date_from: e.target.value || null })}
              aria-label="From date"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => updateParams({ date_to: e.target.value || null })}
              aria-label="To date"
            />
            <div className="flex gap-2 sm:col-span-2 xl:col-span-5">
              <Button type="submit">Apply</Button>
              {(q || category || actorId || dateFrom || dateTo) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSearchInput("");
                    router.push(`/${tenantSlug}/activities`);
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          {error}
          <Button variant="ghost" className="ml-2 h-auto p-0 text-red-700" onClick={() => void refresh()}>
            Retry
          </Button>
        </div>
      )}

      <EnterpriseTimeline
        tenantSlug={tenantSlug}
        activities={items}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onOpen={(a) => setDrawerId(a.id)}
        onDelete={canDelete("activity") ? handleDelete : undefined}
        selectedId={drawerId}
      />

      <ActivityDrawer tenantSlug={tenantSlug} activityId={drawerId} onClose={() => setDrawerId(null)} />

      <ActivityFormDialog
        open={formOpen}
        tenantSlug={tenantSlug}
        onClose={() => setFormOpen(false)}
        onSubmit={async (data) => {
          await createActivity(tenantSlug, data);
          await refresh();
        }}
      />
    </div>
  );
}
