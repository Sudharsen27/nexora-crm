import { PortalAiPage } from "@/components/portal/portal-ai-page";

export default async function Page({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  return <PortalAiPage tenantSlug={tenantSlug} />;
}
