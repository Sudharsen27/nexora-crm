import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeSelector } from "@/components/layout/theme-toggle";

export default function TenantSettingsPage() {
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
