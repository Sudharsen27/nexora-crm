import { Suspense } from "react";
import { NotificationsPage } from "@/components/notifications/notifications-page";

export default async function NotificationsRoutePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  return (
    <Suspense fallback={<p className="text-zinc-500">Loading notifications...</p>}>
      <NotificationsPage tenantSlug={tenantSlug} />
    </Suspense>
  );
}
