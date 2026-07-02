import { WorkflowsListPage } from "@/components/workflows/workflows-list-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <WorkflowsListPage tenantSlug={tenantSlug} />;
}
