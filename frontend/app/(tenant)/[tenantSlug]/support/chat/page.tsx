import { Suspense } from "react";
import { LiveChatPage } from "@/components/support/live-chat-page";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantSlug } = await params;
  return (
    <Suspense fallback={<p className="text-[var(--muted-foreground)]">Loading chat…</p>}>
      <LiveChatPage tenantSlug={tenantSlug} />
    </Suspense>
  );
}
