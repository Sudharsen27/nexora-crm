import { PortalDocumentsPage } from "@/components/portal/portal-documents-page";

export default async function Page({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  return <PortalDocumentsPage tenantSlug={tenantSlug} />;
}
