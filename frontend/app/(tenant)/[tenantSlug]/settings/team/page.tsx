import { TeamManagement } from "@/components/team/team-management";

export default async function TeamSettingsPage({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  return <TeamManagement tenantSlug={tenantSlug} />;
}
