import { AgentsRecommendationsPage } from "@/components/agents/agents-recommendations-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <AgentsRecommendationsPage tenantSlug={tenantSlug} />;
}
