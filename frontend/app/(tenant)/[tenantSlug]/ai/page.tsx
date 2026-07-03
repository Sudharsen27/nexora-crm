import { Suspense } from "react";
import { AiWorkspacePage } from "@/components/ai/ai-workspace-page";
import { WidgetSkeleton } from "@/components/dashboard/widget-states";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return (
    <Suspense fallback={<WidgetSkeleton variant="list" />}>
      <AiWorkspacePage tenantSlug={tenantSlug} />
    </Suspense>
  );
}
