"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { NexoraAuthLogo } from "@/components/brand/nexora-auth-logo";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/api/auth";
import { cn } from "@/lib/utils";
import { useState } from "react";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormData = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const tokenLooksInvalid = token.length > 0 && token.length < 16;
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    if (!token) {
      setError("Reset link is invalid. Request a new one.");
      return;
    }
    setError(null);
    try {
      await resetPassword({ token, password: data.password });
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update password. Request a new link.");
    }
  }

  if (!token || tokenLooksInvalid) {
    return (
      <div className="w-full max-w-md space-y-6">
        <div className="flex justify-center pb-2">
          <NexoraAuthLogo href="/" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Link expired or invalid</CardTitle>
            <CardDescription>
              This password reset link is no longer valid. Request a new one from the sign-in page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/forgot-password" className={cn(buttonVariants(), "inline-flex w-full justify-center")}>
              Request new reset link
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="flex justify-center">
        <div className="flex justify-center pb-2">
          <NexoraAuthLogo href="/" />
        </div>
      </div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Set a new password</CardTitle>
          <CardDescription>Use at least 8 characters with a mix of letters and numbers.</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/50">
                <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" aria-hidden />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-semibold text-[var(--foreground)]">Password updated</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Your password has been changed. Redirecting you to sign in…
                </p>
              </div>
              <Link href="/login" className="inline-block text-sm font-medium text-[var(--primary)] hover:underline">
                Sign in now
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New password</Label>
                <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
                {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Update password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
