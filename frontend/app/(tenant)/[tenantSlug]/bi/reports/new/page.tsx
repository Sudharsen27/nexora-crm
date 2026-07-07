import { BiReportBuilderPage } from "@/components/bi/bi-report-builder-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <BiReportBuilderPage tenantSlug={tenantSlug} />;
}
