import { CompaniesPage } from "@/components/companies/companies-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function CompaniesRoutePage({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <CompaniesPage tenantSlug={tenantSlug} />;
}
