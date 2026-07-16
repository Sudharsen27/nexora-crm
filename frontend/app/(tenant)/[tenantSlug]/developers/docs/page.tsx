import { DevelopersDocsPage } from "@/components/developers/developers-docs-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <DevelopersDocsPage tenantSlug={tenantSlug} />;
}
