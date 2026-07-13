import { AdminCustomFieldsPage } from "@/components/admin/admin-custom-fields-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <AdminCustomFieldsPage tenantSlug={tenantSlug} />;
}
