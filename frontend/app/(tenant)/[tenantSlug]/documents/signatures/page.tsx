import { SignatureDashboard } from "@/components/documents/signature-dashboard";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <SignatureDashboard tenantSlug={tenantSlug} />;
}
