import { DealDetailPage } from "@/components/deals/deal-detail-page";

export default async function DealDetailRoutePage({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
}) {
  const { tenantSlug, id } = await params;
  return <DealDetailPage tenantSlug={tenantSlug} dealId={id} />;
}
