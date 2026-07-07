import { BiDashboardsPage } from "@/components/bi/bi-dashboards-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <BiDashboardsPage tenantSlug={tenantSlug} />;
}
