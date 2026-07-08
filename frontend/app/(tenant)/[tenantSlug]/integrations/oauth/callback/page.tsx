import { Suspense } from "react";
import { OAuthCallbackPage } from "@/components/integrations/oauth-callback-page";
import { WidgetSkeleton } from "@/components/dashboard/widget-states";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return (
    <Suspense fallback={<WidgetSkeleton variant="chart" />}>
      <OAuthCallbackPage tenantSlug={tenantSlug} />
    </Suspense>
  );
}
