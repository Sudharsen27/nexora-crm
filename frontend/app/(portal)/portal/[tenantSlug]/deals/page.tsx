import { PortalDealsPage } from "@/components/portal/portal-deals-page";

export default async function Page({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  return <PortalDealsPage tenantSlug={tenantSlug} />;
}
