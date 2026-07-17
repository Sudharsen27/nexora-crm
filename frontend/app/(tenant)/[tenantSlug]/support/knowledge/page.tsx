import { KnowledgePage } from "@/components/support/knowledge-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <KnowledgePage tenantSlug={tenantSlug} />;
}
