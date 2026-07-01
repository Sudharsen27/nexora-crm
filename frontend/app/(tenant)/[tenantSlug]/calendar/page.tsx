import dynamic from "next/dynamic";
import { Suspense } from "react";

const CalendarPage = dynamic(
  () => import("@/components/calendar/calendar-page").then((mod) => mod.CalendarPage),
  { loading: () => <p className="text-zinc-500">Loading calendar...</p> },
);

export default async function CalendarRoutePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  return (
    <Suspense fallback={<p className="text-zinc-500">Loading calendar...</p>}>
      <CalendarPage tenantSlug={tenantSlug} />
    </Suspense>
  );
}
