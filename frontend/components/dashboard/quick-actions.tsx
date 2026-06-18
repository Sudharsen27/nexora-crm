"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

interface QuickActionsProps {
  tenantSlug: string;
}

const actions = [
  { href: "leads/new", label: "Lead" },
  { href: "deals", label: "Deal" },
  { href: "tasks", label: "Task" },
  { href: "activities", label: "Activity" },
] as const;

export function QuickActions({ tenantSlug }: QuickActionsProps) {
  return (
    <nav aria-label="Quick actions" className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={`/${tenantSlug}/${action.href}`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {action.label}
        </Link>
      ))}
    </nav>
  );
}
