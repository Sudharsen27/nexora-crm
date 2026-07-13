import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeSelector } from "@/components/layout/theme-toggle";

interface PageProps {
  params: Promise<{ tenantSlug: string }>;
}

export default async function TenantSettingsPage({ params }: PageProps) {
  const { tenantSlug } = await params;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Settings</h2>
        <p className="text-zinc-500">Manage your organization and personal preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Choose how Nexora looks on your device.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeSelector />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Administration</CardTitle>
          <CardDescription>Security, audit logs, identity, API keys, and organization policies.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={`/${tenantSlug}/admin`}
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Open Admin Console
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mobile & Offline</CardTitle>
          <CardDescription>Install the PWA, manage offline cache, and push notifications.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={`/${tenantSlug}/mobile`}
            className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Open Mobile Hub
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization settings</CardTitle>
          <CardDescription>Additional settings will be available in future phases.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-500">Use the Team page to manage members and roles.</p>
        </CardContent>
      </Card>
    </div>
  );
}
