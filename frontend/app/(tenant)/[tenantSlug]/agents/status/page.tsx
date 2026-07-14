import { AgentsStatusPage } from "@/components/agents/agents-status-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <AgentsStatusPage tenantSlug={tenantSlug} />;
}
