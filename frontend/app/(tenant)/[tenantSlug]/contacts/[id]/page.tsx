import { ContactDetailPage } from "@/components/contacts/contact-detail-page";

export default async function ContactDetailRoutePage({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
}) {
  const { tenantSlug, id } = await params;
  return <ContactDetailPage tenantSlug={tenantSlug} contactId={id} />;
}
