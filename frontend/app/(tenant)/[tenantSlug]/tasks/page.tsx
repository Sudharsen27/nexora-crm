import { Suspense } from "react";
import { TasksPage } from "@/components/tasks/tasks-page";

export default async function TasksRoutePage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  return (
    <Suspense fallback={<p className="text-zinc-500">Loading tasks...</p>}>
      <TasksPage tenantSlug={tenantSlug} />
    </Suspense>
  );
}
