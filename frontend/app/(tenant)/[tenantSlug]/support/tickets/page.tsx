import { Suspense } from "react";
import { TicketsPage } from "@/components/support/tickets-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return (
    <Suspense fallback={<p className="text-[var(--muted-foreground)]">Loading tickets…</p>}>
      <TicketsPage tenantSlug={tenantSlug} />
    </Suspense>
  );
}
