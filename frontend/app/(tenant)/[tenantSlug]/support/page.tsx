import { SupportDashboardPage } from "@/components/support/support-dashboard-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <SupportDashboardPage tenantSlug={tenantSlug} />;
}
