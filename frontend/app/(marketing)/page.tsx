import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export default function MarketingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-xl font-bold">Nexora CRM</span>
          <div className="flex gap-3">
            <Link href="/login" className={cn(buttonVariants({ variant: "ghost" }))}>
              Sign in
            </Link>
            <Link href="/register" className={cn(buttonVariants())}>
              Get started
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-1 flex-col justify-center px-6 py-24">
        <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-500">
          Multi-tenant SaaS CRM
        </p>
        <h1 className="max-w-3xl text-5xl font-bold tracking-tight">
          Customer relationships, built for modern teams.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
          Nexora CRM gives your organization a secure, role-based workspace to manage customers
          and grow revenue — starting with enterprise-grade auth and team management.
        </p>
        <div className="mt-10 flex gap-4">
          <Link href="/register" className={cn(buttonVariants({ size: "lg" }))}>
            Start free
          </Link>
          <Link href="/login" className={cn(buttonVariants({ size: "lg", variant: "outline" }))}>
            Sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
