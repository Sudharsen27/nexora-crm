import { AgentsHistoryPage } from "@/components/agents/agents-history-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <AgentsHistoryPage tenantSlug={tenantSlug} />;
}
