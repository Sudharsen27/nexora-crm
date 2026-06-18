import { cn } from "@/lib/utils";

interface NexoraMarkProps {
  className?: string;
  title?: string;
}

/** Nexora brand mark — pipeline layers on violet (matches app/icon.svg). */
export function NexoraMark({ className, title = "Nexora" }: NexoraMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label={title}
      className={cn("shrink-0", className)}
    >
      <rect width="32" height="32" rx="8" fill="currentColor" className="text-[var(--primary)]" />
      <rect x="7" y="8" width="18" height="3.5" rx="1.75" fill="white" fillOpacity="0.95" />
      <rect x="7" y="14.25" width="18" height="3.5" rx="1.75" fill="white" fillOpacity="0.75" />
      <rect x="7" y="20.5" width="18" height="3.5" rx="1.75" fill="white" fillOpacity="0.55" />
      <circle cx="11" cy="9.75" r="1.25" className="fill-[var(--primary)]" />
      <circle cx="11" cy="16" r="1.25" className="fill-[var(--primary)]" />
      <circle cx="11" cy="22.25" r="1.25" className="fill-[var(--primary)]" />
    </svg>
  );
}
