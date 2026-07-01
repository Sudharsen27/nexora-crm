import dynamic from "next/dynamic";
import { Suspense } from "react";

const EmailDetailPage = dynamic(
  () => import("@/components/emails/email-detail-page").then((mod) => mod.EmailDetailPage),
  { loading: () => <p className="text-zinc-500">Loading email...</p> },
);

export default async function EmailDetailRoutePage({
  params,
}: {
  params: Promise<{ tenantSlug: string; emailId: string }>;
}) {
  const { tenantSlug, emailId } = await params;
  return (
    <Suspense fallback={<p className="text-zinc-500">Loading email...</p>}>
      <EmailDetailPage tenantSlug={tenantSlug} emailId={emailId} />
    </Suspense>
  );
}
