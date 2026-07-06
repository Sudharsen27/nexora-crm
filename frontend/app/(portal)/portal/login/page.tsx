import { PortalLoginForm } from "@/components/portal/portal-login-form";
import { FloatingThemeToggle } from "@/components/layout/theme-toggle";

export default function PortalLoginPage() {
  return (
    <div className="relative min-h-screen">
      <FloatingThemeToggle />
      <PortalLoginForm />
    </div>
  );
}
