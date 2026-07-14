import { AgentsMemoryPage } from "@/components/agents/agents-memory-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <AgentsMemoryPage tenantSlug={tenantSlug} />;
}
