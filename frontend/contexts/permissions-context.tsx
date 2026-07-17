import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getTenantPermissions } from "@/lib/api/tenants";

export type PermissionModule =
  | "lead"
  | "contact"
  | "company"
  | "deal"
  | "activity"
  | "notification"
  | "meeting"
  | "email"
  | "support"
  | "task"
  | "user"
  | "tenant"
  | "settings"
  | "role"
  | "workflow"
  | "document";

interface PermissionsContextValue {
  role: string | null;
  roleName: string | null;
  permissions: string[];
  loading: boolean;
  can: (permission: string) => boolean;
  canRead: (module: PermissionModule) => boolean;
  canWrite: (module: PermissionModule) => boolean;
  canDelete: (module: PermissionModule) => boolean;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

interface PermissionsProviderProps {
  tenantSlug: string;
  children: React.ReactNode;
}

export function PermissionsProvider({ tenantSlug, children }: PermissionsProviderProps) {
  const [role, setRole] = useState<string | null>(null);
  const [roleName, setRoleName] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    void getTenantPermissions(tenantSlug)
      .then((data) => {
        if (cancelled) return;
        setRole(data.role);
        setRoleName(data.role_name);
        setPermissions(data.permissions);
      })
      .catch(() => {
        if (!cancelled) {
          setRole(null);
          setRoleName(null);
          setPermissions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tenantSlug]);

  const value = useMemo<PermissionsContextValue>(
    () => ({
      role,
      roleName,
      permissions,
      loading,
      can: (permission) => permissions.includes(permission),
      canRead: (module) => permissions.includes(`${module}:read`),
      canWrite: (module) => permissions.includes(`${module}:write`),
      canDelete: (module) => permissions.includes(`${module}:delete`),
    }),
    [role, roleName, permissions, loading],
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions(): PermissionsContextValue {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissions must be used within PermissionsProvider");
  }
  return context;
}

interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { can, loading } = usePermissions();
  if (loading) return null;
  if (!can(permission)) return fallback;
  return children;
}
