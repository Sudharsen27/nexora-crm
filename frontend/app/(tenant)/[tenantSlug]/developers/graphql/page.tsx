import { DevelopersGraphqlPage } from "@/components/developers/developers-graphql-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <DevelopersGraphqlPage tenantSlug={tenantSlug} />;
}
