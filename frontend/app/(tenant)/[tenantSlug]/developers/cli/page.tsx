import { DevelopersCliPage } from "@/components/developers/developers-cli-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <DevelopersCliPage tenantSlug={tenantSlug} />;
}
