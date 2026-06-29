import { LoginForm } from "@/components/auth/login-form";
import { FloatingThemeToggle } from "@/components/layout/theme-toggle";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <FloatingThemeToggle />
      <LoginForm />
    </div>
  );
}
