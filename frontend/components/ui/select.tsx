import * as React from "react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "dark:bg-zinc-900 dark:focus-visible:ring-offset-zinc-950",
        className,
      )}
      {...props}
    />
  );
});
Select.displayName = "Select";

export { Select };
