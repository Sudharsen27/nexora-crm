import { Suspense } from "react";
import { BiExecutivePage } from "@/components/bi/bi-executive-page";
import { WidgetSkeleton } from "@/components/dashboard/widget-states";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return (
    <Suspense fallback={<WidgetSkeleton variant="chart" />}>
      <BiExecutivePage tenantSlug={tenantSlug} />
    </Suspense>
  );
}
