import { PortalInvoicesPage } from "@/components/portal/portal-invoices-page";

export default async function Page({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  return <PortalInvoicesPage tenantSlug={tenantSlug} />;
}
