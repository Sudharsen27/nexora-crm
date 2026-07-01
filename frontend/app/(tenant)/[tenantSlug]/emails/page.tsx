import dynamic from "next/dynamic";
import { Suspense } from "react";

const EmailsPage = dynamic(
  () => import("@/components/emails/emails-page").then((mod) => mod.EmailsPage),
  { loading: () => <p className="text-zinc-500">Loading email center...</p> },
);

export default async function EmailsRoutePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  return (
    <Suspense fallback={<p className="text-zinc-500">Loading email center...</p>}>
      <EmailsPage tenantSlug={tenantSlug} />
    </Suspense>
  );
}
