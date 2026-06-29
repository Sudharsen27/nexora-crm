import { CreateOrganizationPageClient } from "@/components/onboarding/create-organization-page-client";
import { FloatingThemeToggle } from "@/components/layout/theme-toggle";

export default function CreateOrganizationPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <FloatingThemeToggle />
      <CreateOrganizationPageClient />
    </div>
  );
}
