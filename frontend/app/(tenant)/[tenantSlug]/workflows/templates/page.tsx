import { WorkflowTemplatesPage } from "@/components/workflows/workflow-templates-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <WorkflowTemplatesPage tenantSlug={tenantSlug} />;
}
