import { BiDashboardDetailPage } from "@/components/bi/bi-dashboard-detail-page";

interface PageProps {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug, id } = await params;
  return <BiDashboardDetailPage tenantSlug={tenantSlug} dashboardId={id} />;
}
