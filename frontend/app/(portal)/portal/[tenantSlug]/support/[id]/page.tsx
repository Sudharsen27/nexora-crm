import { PortalTicketDetailPage } from "@/components/portal/portal-ticket-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
}) {
  const { tenantSlug, id } = await params;
  return <PortalTicketDetailPage tenantSlug={tenantSlug} ticketId={id} />;
}
