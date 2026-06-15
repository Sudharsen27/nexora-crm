import { DealsKanban } from "@/components/deals/deals-kanban";

export default async function DealsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  return <DealsKanban tenantSlug={tenantSlug} />;
}
