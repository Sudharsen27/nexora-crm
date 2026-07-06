import { PortalKnowledgePage } from "@/components/portal/portal-knowledge-page";

export default async function Page({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  return <PortalKnowledgePage tenantSlug={tenantSlug} />;
}
