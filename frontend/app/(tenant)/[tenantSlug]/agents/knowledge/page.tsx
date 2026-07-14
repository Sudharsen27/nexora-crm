import { AgentsKnowledgePage } from "@/components/agents/agents-knowledge-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <AgentsKnowledgePage tenantSlug={tenantSlug} />;
}
