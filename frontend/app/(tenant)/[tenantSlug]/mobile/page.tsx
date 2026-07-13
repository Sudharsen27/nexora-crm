import { MobileHubPage } from "@/components/mobile/mobile-hub-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <MobileHubPage tenantSlug={tenantSlug} />;
}
