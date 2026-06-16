import { TaskDetailPage } from "@/components/tasks/task-detail-page";

export default async function TaskDetailRoutePage({
  params,
}: {
  params: Promise<{ tenantSlug: string; id: string }>;
}) {
  const { tenantSlug, id } = await params;
  return <TaskDetailPage tenantSlug={tenantSlug} taskId={id} />;
}
