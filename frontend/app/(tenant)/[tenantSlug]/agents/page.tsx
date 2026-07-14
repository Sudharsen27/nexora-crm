import { AgentsOverviewPage } from "@/components/agents/agents-overview-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <AgentsOverviewPage tenantSlug={tenantSlug} />;
}
