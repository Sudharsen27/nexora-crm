"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { ActivityFormDialog } from "@/components/activities/activity-form-dialog";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/contexts/permissions-context";
import {
  ACTIVITY_TYPE_ICONS,
  deleteActivity,
  formatRelativeTime,
  getActivityTitle,
  listActivities,
  listContactActivities,
  listCompanyActivities,
  listDealActivities,
  listLeadActivities,
  updateActivity,
  type ActivityInput,
} from "@/lib/api/activities";
import type { Activity, ActivityFilters } from "@/types/api";

interface ActivityTimelineProps {
  tenantSlug: string;
  entityType?: "lead" | "contact" | "deal" | "company";
  entityId?: string;
  activities?: Activity[];
  compact?: boolean;
  pageSize?: number;
  showDelete?: boolean;
  showEdit?: boolean;
  lockEntityOnEdit?: boolean;
  refreshKey?: number;
  onChanged?: () => void;
}

export function ActivityTimeline({
  tenantSlug,
  entityType,
  entityId,
  activities: externalActivities,
  compact = false,
  pageSize = 20,
  showDelete = false,
  showEdit: showEditOption,
  lockEntityOnEdit = true,
  refreshKey = 0,
  onChanged,
}: ActivityTimelineProps) {
  const { canWrite, canDelete, loading: permsLoading } = usePermissions();
  const allowEdit = !permsLoading && (showEditOption ?? showDelete) && canWrite("activity");
  const allowDelete = !permsLoading && showDelete && canDelete("activity");
  const [activities, setActivities] = useState<Activity[]>(externalActivities ?? []);
  const [loading, setLoading] = useState(!externalActivities);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Activity | null>(null);

  const loadActivities = useCallback(async () => {
    if (externalActivities) {
      setActivities(externalActivities);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const filters: ActivityFilters = { page_size: pageSize };
      let data;
      if (entityType === "contact" && entityId) {
        data = await listContactActivities(tenantSlug, entityId, filters);
      } else if (entityType === "deal" && entityId) {
        data = await listDealActivities(tenantSlug, entityId, filters);
      } else if (entityType === "company" && entityId) {
        data = await listCompanyActivities(tenantSlug, entityId, filters);
      } else if (entityType === "lead" && entityId) {
        data = await listLeadActivities(tenantSlug, entityId, filters);
      } else {
        data = await listActivities(tenantSlug, filters);
      }
      setActivities(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load activities");
    } finally {
      setLoading(false);
    }
  }, [tenantSlug, entityType, entityId, pageSize, externalActivities]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities, refreshKey]);

  useEffect(() => {
    if (externalActivities) {
      setActivities(externalActivities);
      setLoading(false);
    }
  }, [externalActivities]);

  async function handleDelete(activity: Activity) {
    if (!confirm("Delete this activity?")) return;
    try {
      await deleteActivity(tenantSlug, activity.id);
      if (externalActivities) {
        onChanged?.();
      } else {
        await loadActivities();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete activity");
    }
  }

  async function handleEditSave(data: ActivityInput) {
    if (!editing) return;
    await updateActivity(tenantSlug, editing.id, data);
    setEditing(null);
    if (externalActivities) {
      onChanged?.();
    } else {
      await loadActivities();
    }
  }

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-20 rounded-xl bg-[var(--surface-muted)]" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (activities.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">
        No activities yet. Log your first interaction.
      </p>
    );
  }

  return (
    <>
      <div className="space-y-0">
        {activities.map((activity, index) => (
          <div key={activity.id} className="relative flex gap-4 pb-6">
            {index < activities.length - 1 && (
              <span className="absolute left-[19px] top-10 h-[calc(100%-2rem)] w-px bg-[var(--border)]" />
            )}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-lg">
              {ACTIVITY_TYPE_ICONS[activity.activity_type] ?? "📌"}
            </div>
            <div className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{getActivityTitle(activity)}</p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    {activity.description}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {activity.created_by?.full_name ?? "Unknown user"} ·{" "}
                    {formatRelativeTime(activity.created_at)}
                  </p>
                  {!compact && (
                    <p className="mt-1 text-xs text-zinc-400">
                      {activity.entity_type} · {activity.activity_type.replace("_", " ")}
                    </p>
                  )}
                </div>
                {(allowEdit || allowDelete) && (
                  <div className="flex shrink-0 gap-1">
                    {allowEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(activity)}
                        aria-label="Edit activity"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {allowDelete && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDelete(activity)}
                        aria-label="Delete activity"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <ActivityFormDialog
        open={Boolean(editing)}
        tenantSlug={tenantSlug}
        initial={editing}
        lockEntity={lockEntityOnEdit}
        onClose={() => setEditing(null)}
        onSubmit={handleEditSave}
      />
    </>
  );
}
