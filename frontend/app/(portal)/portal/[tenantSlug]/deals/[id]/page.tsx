import { PortalDealDetailPage } from "@/components/portal/portal-deal-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
}) {
  const { tenantSlug, id } = await params;
  return <PortalDealDetailPage tenantSlug={tenantSlug} dealId={id} />;
}
