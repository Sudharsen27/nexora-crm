import { Suspense } from "react";
import { LeadsPage } from "@/components/leads/leads-page";

export default async function LeadsRoutePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  return (
    <Suspense fallback={<p className="text-zinc-500">Loading leads...</p>}>
      <LeadsPage tenantSlug={tenantSlug} />
    </Suspense>
  );
}
