import { DevelopersOverviewPage } from "@/components/developers/developers-overview-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <DevelopersOverviewPage tenantSlug={tenantSlug} />;
}
