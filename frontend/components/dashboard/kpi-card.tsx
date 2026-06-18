"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  icon: LucideIcon;
  tone?: "default" | "danger" | "warning" | "success";
  className?: string;
}

const toneStyles = {
  default: "bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
};

export function KpiCard({ label, value, hint, href, icon: Icon, tone = "default", className }: KpiCardProps) {
  const content = (
    <Card
      className={cn(
        "h-full transition-all hover:shadow-md",
        href && "cursor-pointer hover:border-[var(--primary)]/30",
        className,
      )}
    >
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <div className="flex items-center justify-between gap-3">
          <CardTitle
            className={cn("text-3xl tabular-nums tracking-tight", tone === "danger" && "text-red-600 dark:text-red-400")}
          >
            {value}
          </CardTitle>
          <span className={cn("rounded-lg p-2", toneStyles[tone])} aria-hidden>
            <Icon className="h-4 w-4" />
          </span>
        </div>
      </CardHeader>
      {hint ? (
        <CardContent>
          <p className="text-sm text-[var(--muted-foreground)]">{hint}</p>
        </CardContent>
      ) : null}
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]">
        {content}
      </Link>
    );
  }

  return content;
}
