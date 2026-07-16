import { DevelopersApiExplorerPage } from "@/components/developers/developers-api-explorer-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <DevelopersApiExplorerPage tenantSlug={tenantSlug} />;
}
