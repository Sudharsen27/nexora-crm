import { DevelopersSdkPage } from "@/components/developers/developers-sdk-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <DevelopersSdkPage tenantSlug={tenantSlug} />;
}
