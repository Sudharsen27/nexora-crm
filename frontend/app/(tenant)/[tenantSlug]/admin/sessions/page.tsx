import { AdminSessionsPage } from "@/components/admin/admin-sessions-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <AdminSessionsPage tenantSlug={tenantSlug} />;
}
