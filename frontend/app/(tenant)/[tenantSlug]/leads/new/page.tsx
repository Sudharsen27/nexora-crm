import { NewLeadPageClient } from "@/components/leads/new-lead-page-client";

export default async function NewLeadPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  return <NewLeadPageClient tenantSlug={tenantSlug} />;
}
