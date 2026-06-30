import { PipelinePage } from "@/components/pipeline/pipeline-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <PipelinePage tenantSlug={tenantSlug} />;
}
