import { PortalProfilePage } from "@/components/portal/portal-profile-page";

export default async function Page({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  return <PortalProfilePage tenantSlug={tenantSlug} />;
}
