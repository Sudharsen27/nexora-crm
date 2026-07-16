import { DevelopersWebhooksPage } from "@/components/developers/developers-webhooks-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <DevelopersWebhooksPage tenantSlug={tenantSlug} />;
}
