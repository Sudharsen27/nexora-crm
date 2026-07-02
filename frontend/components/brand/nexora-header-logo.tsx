import Link from "next/link";
import { cn } from "@/lib/utils";

interface NexoraHeaderLogoProps {
  href?: string;
  className?: string;
}

function NexoraIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-7 w-7 shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id="nexoraHeaderN" x1="8" y1="40" x2="40" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1d4ed8" />
          <stop offset="0.5" stopColor="#2563eb" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <path
        d="M10 38V10h4.8l8.7 14.1V10H38v28h-4.7l-8.8-14.4V38H10z"
        fill="url(#nexoraHeaderN)"
      />
    </svg>
  );
}

export function NexoraHeaderLogo({ href = "/", className }: NexoraHeaderLogoProps) {
  const content = (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <NexoraIcon />
      </div>
      <span className="text-lg font-bold tracking-[0.14em] text-[var(--foreground)]">
        NE
        <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 bg-clip-text text-transparent">
          X
        </span>
        ORA
      </span>
    </div>
  );

  return (
    <Link href={href} className="inline-flex transition-opacity hover:opacity-90">
      {content}
    </Link>
  );
}
