import { DashboardTaskWidgets } from "@/components/dashboard/dashboard-task-widgets";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import Link from "next/link";

export default async function TenantDashboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Dashboard</h2>
          <p className="text-[var(--muted-foreground)]">Track pipeline, revenue, and team activity in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/${tenantSlug}/tasks?due=overdue`} className={buttonVariants({ variant: "outline" })}>
            Review overdue
          </Link>
          <Link href={`/${tenantSlug}/tasks`} className={buttonVariants()}>
            Open tasks
          </Link>
        </div>
      </div>

      <DashboardTaskWidgets tenantSlug={tenantSlug} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
            <CardDescription>Your workspace slug</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="inline-flex rounded-lg bg-[var(--surface-muted)] px-3 py-1.5 font-mono text-sm">/{tenantSlug}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Workspace snapshot</CardTitle>
            <CardDescription>Quick overview of active modules</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-[var(--muted-foreground)]">
              <li>Leads, Contacts, Deals pipeline</li>
              <li>Activities timeline</li>
              <li>Tasks and follow-ups</li>
              <li>Role-based team management</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
