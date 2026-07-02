import Image from "next/image";
import { cn } from "@/lib/utils";

interface NexoraMarkProps {
  className?: string;
  title?: string;
}

/** Nexora brand mark — top portion of the official logo (N icon). */
export function NexoraMark({ className, title = "Nexora" }: NexoraMarkProps) {
  return (
    <Image
      src="/nexora-logo.png"
      alt={title}
      width={64}
      height={64}
      priority
      className={cn("shrink-0 object-cover object-top", className)}
    />
  );
}
