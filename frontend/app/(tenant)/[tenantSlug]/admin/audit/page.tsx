import { AdminAuditPage } from "@/components/admin/admin-audit-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <AdminAuditPage tenantSlug={tenantSlug} />;
}
