import { IntegrationsInstalledPage } from "@/components/integrations/integrations-installed-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <IntegrationsInstalledPage tenantSlug={tenantSlug} />;
}
