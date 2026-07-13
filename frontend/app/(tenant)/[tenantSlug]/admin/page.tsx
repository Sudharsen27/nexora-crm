import { AdminDashboardPage } from "@/components/admin/admin-dashboard-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <AdminDashboardPage tenantSlug={tenantSlug} />;
}
