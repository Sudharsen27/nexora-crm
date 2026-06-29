import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { FloatingThemeToggle } from "@/components/layout/theme-toggle";

export default function ForgotPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <FloatingThemeToggle />
      <ForgotPasswordForm />
    </div>
  );
}
