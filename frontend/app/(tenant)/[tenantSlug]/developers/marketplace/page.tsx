import { DevelopersMarketplacePage } from "@/components/developers/developers-marketplace-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <DevelopersMarketplacePage tenantSlug={tenantSlug} />;
}
