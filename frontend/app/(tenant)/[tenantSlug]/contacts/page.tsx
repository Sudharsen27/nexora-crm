import { Suspense } from "react";
import { ContactsPage } from "@/components/contacts/contacts-page";

export default async function ContactsRoutePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  return (
    <Suspense fallback={<p className="text-zinc-500">Loading contacts...</p>}>
      <ContactsPage tenantSlug={tenantSlug} />
    </Suspense>
  );
}
