import { PortalSupportPage } from "@/components/portal/portal-support-page";

export default async function Page({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  return <PortalSupportPage tenantSlug={tenantSlug} />;
}
