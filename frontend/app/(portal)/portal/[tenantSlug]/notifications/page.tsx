import { PortalNotificationsPage } from "@/components/portal/portal-notifications-page";

export default async function Page({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  return <PortalNotificationsPage tenantSlug={tenantSlug} />;
}
