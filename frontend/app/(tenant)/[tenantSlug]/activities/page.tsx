import { Suspense } from "react";
import { ActivitiesPage } from "@/components/activities/activities-page";

export default async function ActivitiesRoutePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  return (
    <Suspense fallback={<p className="text-zinc-500">Loading activities...</p>}>
      <ActivitiesPage tenantSlug={tenantSlug} />
    </Suspense>
  );
}
