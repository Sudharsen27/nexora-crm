"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  FileText,
  Handshake,
  Headphones,
  Lock,
  Shield,
  Sparkles,
} from "lucide-react";
import { NexoraMark } from "@/components/brand/nexora-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { portalLogin } from "@/lib/api/portal";

const STAFF_WORKSPACE_EMAILS = new Set(["owner@example.com", "admin@example.com"]);

function isLikelyStaffWorkspaceEmail(value: string): boolean {
  return STAFF_WORKSPACE_EMAILS.has(value.trim().toLowerCase());
}

function loginErrorMessage(email: string, apiMessage: string): string {
  if (isLikelyStaffWorkspaceEmail(email)) {
    return "This email is for the Nexora workspace (staff), not the customer portal. Use the portal invite from your account team, or sign in to workspace below.";
  }
  if (apiMessage.toLowerCase().includes("invalid")) {
    return "Invalid email or password for this organization. Customer portal accounts are separate from Nexora staff logins.";
  }
  return apiMessage;
}

const FEATURES = [
  { icon: Handshake, label: "Track deals & proposals in real time" },
  { icon: FileText, label: "Secure documents & e-signatures" },
  { icon: Headphones, label: "Dedicated support & knowledge base" },
  { icon: Sparkles, label: "AI assistant for instant answers" },
];

export function PortalLoginForm() {
  const router = useRouter();
  const [tenantSlug, setTenantSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    if (isLikelyStaffWorkspaceEmail(normalizedEmail)) {
      setError(loginErrorMessage(normalizedEmail, "Invalid credentials"));
      return;
    }

    setLoading(true);
    try {
      const data = await portalLogin(tenantSlug.trim(), normalizedEmail, password);
      router.push(`/portal/${data.tenant_slug}`);
    } catch (err) {
      const apiMessage =
        err instanceof Error
          ? err.message
          : "We couldn't sign you in. Check your organization, email, and password.";
      setError(loginErrorMessage(normalizedEmail, apiMessage));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel */}
      <div className="relative hidden w-[44%] overflow-hidden bg-gradient-to-br from-slate-900 via-sky-950 to-cyan-950 lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(56,189,248,0.35) 0%, transparent 45%), radial-gradient(circle at 80% 80%, rgba(99,102,241,0.25) 0%, transparent 40%)",
          }}
        />
        <div className="relative z-10 p-10 xl:p-14">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
              <NexoraMark className="h-7 w-7 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-white">Nexora</p>
              <p className="text-xs text-sky-200/80">Customer Portal</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-8 px-10 pb-16 xl:px-14">
          <div>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white xl:text-4xl">
              Your business hub,
              <br />
              <span className="bg-gradient-to-r from-sky-300 to-cyan-200 bg-clip-text text-transparent">
                always in sync.
              </span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-sky-100/80">
              Access deals, contracts, invoices, meetings, and support — securely, from one
              professional workspace built for your organization.
            </p>
          </div>

          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-sky-50/90">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/10">
                  <Icon className="h-4 w-4 text-sky-200" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10 flex items-center gap-2 border-t border-white/10 px-10 py-5 text-xs text-sky-200/60 xl:px-14">
          <Shield className="h-3.5 w-3.5 shrink-0" />
          Enterprise-grade security · Encrypted sessions · Role-based access
        </div>
      </div>

      {/* Sign-in panel */}
      <div className="flex flex-1 flex-col bg-[var(--background)]">
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-[420px]">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 ring-1 ring-sky-500/20">
                <NexoraMark className="h-6 w-6 text-sky-600" />
              </div>
              <div>
                <p className="font-semibold">Nexora Customer Portal</p>
                <p className="text-xs text-[var(--muted-foreground)]">Secure client access</p>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">
                Sign in
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
                Use the organization and credentials from your portal invitation.
              </p>
            </div>

            <form onSubmit={(e) => void onSubmit(e)} className="space-y-5" autoComplete="off">
              <div className="space-y-2">
                <Label
                  htmlFor="portal-tenant"
                  className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]"
                >
                  Organization
                </Label>
                <Input
                  id="portal-tenant"
                  name="organization"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  placeholder="acme-corp"
                  className="h-11 rounded-xl border-[var(--border)] bg-[var(--surface)] shadow-sm"
                  autoComplete="organization"
                  spellCheck={false}
                  required
                />
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  Your company workspace identifier
                </p>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="portal-email"
                  className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]"
                >
                  Email address
                </Label>
                <Input
                  id="portal-email"
                  name="portal-customer-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="you@company.com"
                  className="h-11 rounded-xl border-[var(--border)] bg-[var(--surface)] shadow-sm"
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore
                  spellCheck={false}
                  required
                />
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  Use the email from your portal invitation — not your Nexora staff login.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label
                    htmlFor="portal-password"
                    className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]"
                  >
                    Password
                  </Label>
                  <span
                    className="text-xs text-[var(--muted-foreground)]"
                    title="Contact your account manager to reset your portal password."
                  >
                    Forgot password?
                  </span>
                </div>
                <div className="relative">
                  <Input
                    id="portal-password"
                    name="portal-customer-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl border-[var(--border)] bg-[var(--surface)] pr-11 shadow-sm"
                    autoComplete="new-password"
                    data-lpignore="true"
                    data-1p-ignore
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex flex-col gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-sm text-rose-700 dark:text-rose-300"
                >
                  <div className="flex gap-3">
                    <Lock className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
                    <span>{error}</span>
                  </div>
                  {isLikelyStaffWorkspaceEmail(email) && (
                    <Link
                      href="/login"
                      className="ml-7 text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
                    >
                      Go to Nexora workspace sign-in →
                    </Link>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="h-11 w-full rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 text-sm font-semibold shadow-lg shadow-sky-500/20 transition hover:from-sky-700 hover:to-cyan-700"
              >
                {loading ? (
                  "Signing in…"
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-8 space-y-4 border-t border-[var(--border)] pt-6">
              <p className="text-center text-sm text-[var(--muted-foreground)]">
                Need portal access?{" "}
                <span className="text-[var(--foreground)]">Contact your account manager.</span>
              </p>
              <p className="text-center text-sm text-[var(--muted-foreground)]">
                Nexora team member?{" "}
                <Link
                  href="/login"
                  className="font-medium text-sky-600 hover:underline dark:text-sky-400"
                >
                  Sign in to workspace
                </Link>
              </p>
            </div>
          </div>
        </div>

        <footer className="border-t border-[var(--border)] px-6 py-4 text-center text-[11px] text-[var(--muted-foreground)] sm:px-10">
          © {new Date().getFullYear()} Nexora · Privacy · Terms
        </footer>
      </div>
    </div>
  );
}
