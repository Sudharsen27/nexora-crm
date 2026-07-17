import { TicketDetailPage } from "@/components/support/ticket-detail-page";

interface PageProps {
  params: Promise<{ tenantSlug: string; id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug, id } = await params;
  return <TicketDetailPage tenantSlug={tenantSlug} ticketId={id} />;
}
