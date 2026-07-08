import { IntegrationsWebhooksPage } from "@/components/integrations/integrations-webhooks-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <IntegrationsWebhooksPage tenantSlug={tenantSlug} />;
}
