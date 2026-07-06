import { PortalCalendarPage } from "@/components/portal/portal-calendar-page";

export default async function Page({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  return <PortalCalendarPage tenantSlug={tenantSlug} />;
}
