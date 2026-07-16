import { DevelopersInstalledPage } from "@/components/developers/developers-installed-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <DevelopersInstalledPage tenantSlug={tenantSlug} />;
}
