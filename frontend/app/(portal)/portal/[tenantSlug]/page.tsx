import { PortalDashboardPage } from "@/components/portal/portal-dashboard-page";

export default async function PortalHomePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  return <PortalDashboardPage tenantSlug={tenantSlug} />;
}
