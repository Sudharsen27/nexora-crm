import { IntegrationDetailPage } from "@/components/integrations/integration-detail-page";

interface PageProps {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug, id } = await params;
  return <IntegrationDetailPage tenantSlug={tenantSlug} integrationId={id} />;
}
