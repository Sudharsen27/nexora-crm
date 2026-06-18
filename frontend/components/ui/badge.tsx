import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]",
        secondary:
          "border-transparent bg-[var(--surface-muted)] text-[var(--foreground)] dark:bg-zinc-800",
        outline: "border-[var(--border)] text-[var(--foreground)]",
        destructive: "border-transparent bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
        success: "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
        warning: "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
