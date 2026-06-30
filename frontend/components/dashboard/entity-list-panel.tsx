"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WidgetEmpty } from "@/components/dashboard/widget-states";
import type { DashboardEntityRef } from "@/types/dashboard";

interface EntityListPanelProps {
  title: string;
  description: string;
  items: DashboardEntityRef[];
  tenantSlug: string;
  emptyTitle: string;
  emptyDescription: string;
  emptyActionLabel?: string;
  emptyActionHref?: string;
}

export function EntityListPanel({
  title,
  description,
  items,
  tenantSlug,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  emptyActionHref,
}: EntityListPanelProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <WidgetEmpty
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={emptyActionLabel}
            actionHref={emptyActionHref}
          />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const href = item.href_path ?? `/${tenantSlug}/${item.entity_type}s/${item.entity_id}`;
              return (
                <li key={item.entity_id}>
                  <Link
                    href={href}
                    className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm transition-colors hover:bg-[var(--surface-muted)]/60"
                  >
                    <span className="font-medium truncate">{item.display_name}</span>
                    <span className="text-xs capitalize text-[var(--muted-foreground)]">
                      {item.entity_type}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
