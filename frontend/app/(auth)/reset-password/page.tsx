import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { FloatingThemeToggle } from "@/components/layout/theme-toggle";

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <FloatingThemeToggle />
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
