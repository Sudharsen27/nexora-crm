import { InboxPage } from "@/components/support/inbox-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return <InboxPage tenantSlug={tenantSlug} />;
}
