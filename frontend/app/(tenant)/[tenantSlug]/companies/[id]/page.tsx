import { CompanyDetailPage } from "@/components/companies/company-detail-page";

interface PageProps {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export default async function CompanyDetailRoutePage({ params }: PageProps) {
  const { tenantSlug, id } = await params;
  return <CompanyDetailPage tenantSlug={tenantSlug} companyId={id} />;
}
