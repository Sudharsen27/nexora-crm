import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface NexoraLogoProps {
  className?: string;
  href?: string;
  /** @deprecated Use imageClassName — full logo image includes the wordmark */
  markClassName?: string;
  imageClassName?: string;
  showText?: boolean;
}

export function NexoraLogo({
  className,
  href,
  markClassName,
  imageClassName,
  showText = false,
}: NexoraLogoProps) {
  const imgClass = imageClassName ?? markClassName ?? "h-16 w-auto";

  const content = (
    <>
      <Image
        src="/nexora-logo.png"
        alt="Nexora CRM"
        width={220}
        height={88}
        priority
        className={cn("object-contain", imgClass)}
      />
      {showText && (
        <span className="sr-only">Nexora</span>
      )}
    </>
  );

  const classes = cn("inline-flex items-center", className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return <div className={classes}>{content}</div>;
}
