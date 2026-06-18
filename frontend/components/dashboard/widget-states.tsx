import { AlertCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface WidgetErrorProps {
  title: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function WidgetError({ title, message, onRetry, className }: WidgetErrorProps) {
  return (
    <Card className={cn("border-red-200 dark:border-red-900/50", className)} role="alert">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <span className="inline-flex rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-950/40 dark:text-red-400">
          <AlertCircle className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="font-medium text-[var(--foreground)]">{title}</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{message}</p>
        </div>
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface WidgetEmptyProps {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}

export function WidgetEmpty({ title, description, actionLabel, actionHref, className }: WidgetEmptyProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)]/50 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="mb-3 inline-flex rounded-full bg-[var(--surface)] p-3 text-[var(--muted-foreground)] shadow-sm">
        <Inbox className="h-5 w-5" aria-hidden />
      </span>
      <p className="font-medium text-[var(--foreground)]">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-[var(--muted-foreground)]">{description}</p>
      {actionLabel && actionHref ? (
        <a
          href={actionHref}
          className="mt-4 text-sm font-medium text-[var(--primary)] underline-offset-4 hover:underline"
        >
          {actionLabel}
        </a>
      ) : null}
    </div>
  );
}

interface WidgetSkeletonProps {
  variant?: "kpi" | "chart" | "list" | "table" | "calendar";
  className?: string;
}

export function WidgetSkeleton({ variant = "chart", className }: WidgetSkeletonProps) {
  if (variant === "kpi") {
    return (
      <Card className={className} aria-busy="true" aria-label="Loading metrics">
        <div className="space-y-3 p-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </Card>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("space-y-3", className)} aria-busy="true" aria-label="Loading list">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (variant === "table") {
    return (
      <div className={cn("space-y-2", className)} aria-busy="true" aria-label="Loading table">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (variant === "calendar") {
    return (
      <div className={cn("grid grid-cols-7 gap-2", className)} aria-busy="true" aria-label="Loading calendar">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)} aria-busy="true" aria-label="Loading chart">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}
