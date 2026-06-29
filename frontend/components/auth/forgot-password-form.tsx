"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { NexoraLogo } from "@/components/brand/nexora-logo";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/api/auth";
import { cn } from "@/lib/utils";
import { useState } from "react";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

type FormData = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setError(null);
    setSubmittedEmail(null);
    setDevResetUrl(null);
    setEmailSent(false);
    setEmailConfigured(false);
    try {
      const result = await requestPasswordReset(data.email);
      setSubmittedEmail(data.email);
      if (result.reset_url) setDevResetUrl(result.reset_url);
      if (result.email_sent) setEmailSent(true);
      if (result.email_configured) setEmailConfigured(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    }
  }

  const showSuccess = submittedEmail !== null;

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="flex justify-center">
        <NexoraLogo href="/" markClassName="h-11 w-11" />
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            {showSuccess
              ? "Follow the link in your email to choose a new password."
              : "Enter the email address linked to your Nexora account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {showSuccess ? (
            <div className="space-y-6">
              {emailSent ? (
                <div className="space-y-4 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950/60">
                    <Mail className="h-7 w-7 text-[var(--primary)]" aria-hidden />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-[var(--foreground)]">Check your email</p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      We sent reset instructions to{" "}
                      <span className="font-medium text-[var(--foreground)]">{submittedEmail}</span>.
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Open the email from Nexora and click <strong>Reset password</strong>. The link
                      expires in 60 minutes.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--foreground)]">
                    If an account exists for{" "}
                    <span className="font-medium">{submittedEmail}</span>, you will receive reset
                    instructions shortly.
                  </p>
                  {devResetUrl && (
                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {emailConfigured
                          ? "Email delivery is unavailable"
                          : "Email is not configured"}
                      </p>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                        {emailConfigured
                          ? "Restart the backend after updating SMTP settings, or continue below."
                          : "Use the button below to reset your password in this environment."}
                      </p>
                      <Link
                        href={devResetUrl}
                        className={cn(buttonVariants(), "mt-4 inline-flex w-full justify-center")}
                      >
                        Continue to reset password
                      </Link>
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col items-center gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <p className="text-center text-xs text-[var(--muted-foreground)]">
                  Didn&apos;t get the email? Check spam, or wait a minute and try again.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedEmail(null);
                    setDevResetUrl(null);
                    setEmailSent(false);
                  }}
                  className="text-sm font-medium text-[var(--primary)] hover:underline"
                >
                  Try another email
                </button>
                <Link href="/login" className="text-sm font-medium text-zinc-600 hover:underline dark:text-zinc-400">
                  Back to sign in
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" {...register("email")} />
                {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send reset link"}
              </Button>
              <p className="text-center text-sm text-zinc-500">
                <Link href="/login" className="font-medium text-zinc-900 dark:text-zinc-100">
                  Back to sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
