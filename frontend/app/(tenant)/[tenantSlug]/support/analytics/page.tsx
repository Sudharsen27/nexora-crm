import { AnalyticsPage } from "@/components/support/analytics-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <AnalyticsPage tenantSlug={tenantSlug} />;
}
