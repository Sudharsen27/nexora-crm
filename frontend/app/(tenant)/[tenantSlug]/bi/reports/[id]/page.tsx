import { BiReportDetailPage } from "@/components/bi/bi-report-detail-page";

interface PageProps {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug, id } = await params;
  return <BiReportDetailPage tenantSlug={tenantSlug} reportId={id} />;
}
