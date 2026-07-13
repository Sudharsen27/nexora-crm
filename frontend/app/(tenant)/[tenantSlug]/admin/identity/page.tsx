import { AdminIdentityPage } from "@/components/admin/admin-identity-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <AdminIdentityPage tenantSlug={tenantSlug} />;
}
