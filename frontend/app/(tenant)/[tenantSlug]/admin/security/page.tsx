import { AdminSecurityPage } from "@/components/admin/admin-security-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <AdminSecurityPage tenantSlug={tenantSlug} />;
}
