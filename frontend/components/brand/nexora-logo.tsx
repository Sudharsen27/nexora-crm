import Link from "next/link";
import { cn } from "@/lib/utils";
import { NexoraMark } from "./nexora-mark";

interface NexoraLogoProps {
  className?: string;
  href?: string;
  showText?: boolean;
  markClassName?: string;
}

export function NexoraLogo({
  className,
  href,
  showText = true,
  markClassName = "h-9 w-9",
}: NexoraLogoProps) {
  const content = (
    <>
      <NexoraMark className={markClassName} />
      {showText && (
        <span className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
          Nexora
        </span>
      )}
    </>
  );

  const classes = cn("inline-flex items-center gap-2.5", className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return <div className={classes}>{content}</div>;
}
