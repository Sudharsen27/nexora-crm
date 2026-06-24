import { LeadDetailPage } from "@/components/leads/lead-detail-page";

interface PageProps {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export default async function LeadDetailRoutePage({ params }: PageProps) {
  const { tenantSlug, id } = await params;
  return <LeadDetailPage tenantSlug={tenantSlug} leadId={id} />;
}
