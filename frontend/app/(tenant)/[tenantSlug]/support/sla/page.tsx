import { SlaPage } from "@/components/support/sla-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <SlaPage tenantSlug={tenantSlug} />;
}
