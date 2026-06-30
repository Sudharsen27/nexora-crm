"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Badge } from "@/components/ui/badge";
import { ActivityTimeline } from "@/components/activities/activity-timeline";
import { formatRelativeTime, getActivity, getActivityTitle } from "@/lib/api/activities";
import { getActivityColorClass, getActorName } from "@/lib/activity-utils";
import type { Activity } from "@/types/api";
import { cn } from "@/lib/utils";

const TABS = ["Overview", "History", "Notes", "Related"] as const;
type Tab = (typeof TABS)[number];

interface ActivityDrawerProps {
  tenantSlug: string;
  activityId: string | null;
  onClose: () => void;
}

export function ActivityDrawer({ tenantSlug, activityId, onClose }: ActivityDrawerProps) {
  const [activity, setActivity] = useState<Activity | null>(null);
  const [tab, setTab] = useState<Tab>("Overview");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activityId) {
      setActivity(null);
      return;
    }
    setLoading(true);
    setError(null);
    setTab("Overview");
    void getActivity(tenantSlug, activityId)
      .then(setActivity)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [tenantSlug, activityId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (activityId) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activityId, onClose]);

  if (!activityId) return null;

  const entityHref = activity?.entity?.href_path ?? null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div className="min-w-0 pr-4">
            {loading ? (
              <div className="h-6 w-48 animate-pulse rounded bg-[var(--border)]" />
            ) : activity ? (
              <>
                <h2 className="truncate text-lg font-semibold">{getActivityTitle(activity)}</h2>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {formatRelativeTime(activity.created_at)} · {getActorName(activity)}
                </p>
              </>
            ) : (
              <p className="text-red-600">{error}</p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-[var(--border)] px-4">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={cn(
                "shrink-0 px-3 py-2.5 text-sm font-medium",
                tab === t
                  ? "border-b-2 border-[var(--primary)] text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)]",
              )}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!loading && activity && tab === "Overview" && (
            <div className="space-y-4 text-sm">
              <Badge className={getActivityColorClass(activity)}>{activity.action.replace(/_/g, " ")}</Badge>
              <p className="text-[var(--foreground)]">{activity.description}</p>
              <dl className="grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-[var(--muted-foreground)]">Actor</dt>
                  <dd>{getActorName(activity)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted-foreground)]">Entity</dt>
                  <dd>
                    {activity.entity ? (
                      entityHref ? (
                        <Link href={entityHref} className="text-[var(--primary)] hover:underline">
                          {activity.entity.display_name}
                        </Link>
                      ) : (
                        activity.entity.display_name
                      )
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-[var(--muted-foreground)]">Type</dt>
                  <dd className="capitalize">{activity.entity_type}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted-foreground)]">When</dt>
                  <dd>{new Date(activity.created_at).toLocaleString()}</dd>
                </div>
              </dl>
              {entityHref && (
                <Link href={entityHref} className={cn(buttonVariants(), "mt-2")}>
                  Open entity
                </Link>
              )}
            </div>
          )}

          {!loading && activity && tab === "History" && activity.entity && (
            <ActivityTimeline
              tenantSlug={tenantSlug}
              entityType={activity.entity_type as "lead" | "contact" | "deal" | "company"}
              entityId={activity.entity_id}
              compact
              pageSize={15}
            />
          )}

          {!loading && activity && tab === "Notes" && activity.entity_type === "contact" && (
            <ActivityTimeline
              tenantSlug={tenantSlug}
              entityType="contact"
              entityId={activity.entity_id}
              filterActivityTypes={["note", "note_added", "note_edited"]}
              pageSize={10}
            />
          )}

          {!loading && activity && tab === "Related" && activity.entity && (
            <div className="space-y-4 text-sm text-[var(--muted-foreground)]">
              <p>Related records linked to this {activity.entity_type}.</p>
              {entityHref && (
                <Link href={entityHref} className={buttonVariants({ variant: "outline" })}>
                  Go to {activity.entity.display_name}
                </Link>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
