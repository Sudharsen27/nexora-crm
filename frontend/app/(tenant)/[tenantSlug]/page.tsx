import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TenantDashboardPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Dashboard</h2>
        <p className="text-zinc-500">Welcome to your organization workspace.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Organization</CardTitle>
            <CardDescription>Your workspace slug</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm">/{tenantSlug}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Foundation ready</CardTitle>
            <CardDescription>Phase 1 complete</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc text-sm text-zinc-600 dark:text-zinc-400">
              <li>JWT authentication with refresh tokens</li>
              <li>Multi-tenant organization isolation</li>
              <li>Role-based team management</li>
              <li>Protected routes</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
