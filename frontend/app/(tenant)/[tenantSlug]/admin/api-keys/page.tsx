import { AdminApiKeysPage } from "@/components/admin/admin-api-keys-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <AdminApiKeysPage tenantSlug={tenantSlug} />;
}
