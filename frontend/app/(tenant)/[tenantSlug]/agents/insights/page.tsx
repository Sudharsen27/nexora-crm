import { AgentsInsightsPage } from "@/components/agents/agents-insights-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <AgentsInsightsPage tenantSlug={tenantSlug} />;
}
