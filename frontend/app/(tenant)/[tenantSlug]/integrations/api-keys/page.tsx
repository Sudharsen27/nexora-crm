import { IntegrationsApiKeysPage } from "@/components/integrations/integrations-api-keys-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <IntegrationsApiKeysPage tenantSlug={tenantSlug} />;
}
