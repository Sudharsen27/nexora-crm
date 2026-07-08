import { Suspense } from "react";
import { IntegrationsHubPage } from "@/components/integrations/integrations-hub-page";
import { WidgetSkeleton } from "@/components/dashboard/widget-states";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return (
    <Suspense fallback={<WidgetSkeleton variant="chart" />}>
      <IntegrationsHubPage tenantSlug={tenantSlug} />
    </Suspense>
  );
}
