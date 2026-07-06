import { PortalDocumentDetailPage } from "@/components/portal/portal-document-detail-page";

export default async function PortalDocumentPage({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
}) {
  const { tenantSlug, id } = await params;
  return <PortalDocumentDetailPage tenantSlug={tenantSlug} documentId={id} />;
}
