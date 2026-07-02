import { WorkflowExecutionsPage } from "@/components/workflows/workflow-executions-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <WorkflowExecutionsPage tenantSlug={tenantSlug} />;
}
