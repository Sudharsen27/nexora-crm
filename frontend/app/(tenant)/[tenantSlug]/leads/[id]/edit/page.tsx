import { EditLeadPageClient } from "@/components/leads/edit-lead-page-client";

export default async function EditLeadPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
}) {
  const { tenantSlug, id } = await params;
  return <EditLeadPageClient tenantSlug={tenantSlug} leadId={id} />;
}
