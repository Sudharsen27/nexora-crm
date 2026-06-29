"use client";

import { usePermissions } from "@/contexts/permissions-context";
import { cn } from "@/lib/utils";

function getRoleLabel(role: string | null, roleName: string | null): string | null {
  if (roleName) return roleName;
  if (!role) return null;
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/** Plain text role label — no badges or boxes. */
export function RoleLabel({ className }: { className?: string }) {
  const { role, roleName, loading } = usePermissions();
  if (loading) {
    return <span className={cn("inline-block h-3 w-12 animate-pulse rounded bg-[var(--surface-muted)]", className)} aria-hidden />;
  }
  const label = getRoleLabel(role, roleName);
  if (!label) return null;
  return <span className={className}>{label}</span>;
}

/** Muted inline phrase for headers: "Demo Company · Member" */
export function TenantSubtitle({
  tenantName,
  className,
}: {
  tenantName: string;
  className?: string;
}) {
  const { role, roleName, loading } = usePermissions();
  const label = getRoleLabel(role, roleName);

  return (
    <p className={cn("truncate text-xs text-[var(--muted-foreground)]", className)}>
      {tenantName}
      {!loading && label ? (
        <>
          {" · "}
          <span className="font-medium text-[var(--foreground)]">{label}</span>
        </>
      ) : null}
    </p>
  );
}
