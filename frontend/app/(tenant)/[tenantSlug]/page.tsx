import { Suspense } from "react";
import { DashboardPage } from "@/components/dashboard/dashboard-page";
import { WidgetSkeleton } from "@/components/dashboard/widget-states";

export default async function TenantDashboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  return (
    <Suspense
      fallback={
        <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
          <div className="h-32 animate-pulse rounded-2xl bg-[var(--surface-muted)]" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <WidgetSkeleton key={i} variant="kpi" />
            ))}
          </div>
        </div>
      }
    >
      <DashboardPage tenantSlug={tenantSlug} />
    </Suspense>
  );
}
