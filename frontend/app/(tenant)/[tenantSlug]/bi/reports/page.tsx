import { BiReportsPage } from "@/components/bi/bi-reports-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <BiReportsPage tenantSlug={tenantSlug} />;
}
