import Link from "next/link";
import { cn } from "@/lib/utils";

interface NexoraAuthLogoProps {
  href?: string;
  className?: string;
}

function NexoraIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-12 w-12", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="nexoraN" x1="8" y1="40" x2="40" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1d4ed8" />
          <stop offset="0.5" stopColor="#2563eb" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <path
        d="M10 38V10h4.8l8.7 14.1V10H38v28h-4.7l-8.8-14.4V38H10z"
        fill="url(#nexoraN)"
      />
    </svg>
  );
}

export function NexoraAuthLogo({ href = "/", className }: NexoraAuthLogoProps) {
  const content = (
    <div className={cn("flex flex-col items-center gap-4 text-center", className)}>
      <div className="relative">
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/25 to-cyan-400/20 blur-xl"
          aria-hidden
        />
        <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-lg shadow-blue-500/10">
          <NexoraIcon className="h-11 w-11" />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-[1.65rem] font-bold tracking-[0.18em] text-[var(--foreground)]">
          NE
          <span className="bg-gradient-to-r from-blue-500 via-sky-500 to-cyan-400 bg-clip-text text-transparent">
            X
          </span>
          ORA
        </p>
        <p className="text-xs font-medium uppercase tracking-[0.35em] text-[var(--muted-foreground)]">
          CRM Platform
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
