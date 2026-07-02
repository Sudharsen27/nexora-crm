import { WorkflowBuilderPage } from "@/components/workflows/workflow-builder-page";

interface PageProps {
  params: Promise<{ tenantSlug: string; workflowId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug, workflowId } = await params;
  return <WorkflowBuilderPage tenantSlug={tenantSlug} workflowId={workflowId} />;
}
