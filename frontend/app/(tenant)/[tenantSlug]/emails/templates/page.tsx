import { Suspense } from "react";
import { EmailTemplatesPage } from "@/components/emails/email-templates-page";

export default async function EmailTemplatesRoutePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  return (
    <Suspense fallback={<p className="text-zinc-500">Loading templates...</p>}>
      <EmailTemplatesPage tenantSlug={tenantSlug} />
    </Suspense>
  );
}
