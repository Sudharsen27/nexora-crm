"use client";

import Link from "next/link";
import { Building2, Calendar, Mail, Plus, User, UserPlus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

interface QuickActionsProps {
  tenantSlug: string;
}

const actions = [
  { href: "leads/new", label: "Lead", icon: UserPlus },
  { href: "companies", label: "Company", icon: Building2 },
  { href: "contacts", label: "Contact", icon: User },
  { href: "deals", label: "Deal", icon: Plus },
  { href: "tasks", label: "Task", icon: Plus },
  { href: "activities", label: "Meeting", icon: Calendar },
  { href: "activities", label: "Email", icon: Mail },
] as const;

export function QuickActions({ tenantSlug }: QuickActionsProps) {
  return (
    <nav aria-label="Quick actions" className="flex flex-wrap gap-2">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={`${action.href}-${action.label}`}
            href={`/${tenantSlug}/${action.href}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {action.label}
          </Link>
        );
      })}
    </nav>
  );
}
