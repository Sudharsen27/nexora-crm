import { AdminOrganizationPage } from "@/components/admin/admin-organization-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <AdminOrganizationPage tenantSlug={tenantSlug} />;
}
