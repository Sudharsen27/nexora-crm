import { BiForecastPage } from "@/components/bi/bi-forecast-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <BiForecastPage tenantSlug={tenantSlug} />;
}
