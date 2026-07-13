import { AdminRolesPage } from "@/components/admin/admin-roles-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <AdminRolesPage tenantSlug={tenantSlug} />;
}
