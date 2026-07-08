import { IntegrationsMarketplacePage } from "@/components/integrations/integrations-marketplace-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <IntegrationsMarketplacePage tenantSlug={tenantSlug} />;
}
