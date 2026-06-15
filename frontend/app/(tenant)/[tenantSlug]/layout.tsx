import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { TenantShell } from "@/components/layout/tenant-shell";
import type { Tenant } from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function fetchTenant(slug: string, token: string): Promise<Tenant | null> {
  const response = await fetch(`${API_BASE}/tenants/${slug}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (response.status === 404 || response.status === 403) return null;
  if (!response.ok) return null;
  return response.json() as Promise<Tenant>;
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const { tenantSlug } = await params;
  const token = (await cookies()).get("nexora_access_token")?.value;

  if (!token) {
    notFound();
  }

  const tenant = await fetchTenant(tenantSlug, token);
  if (!tenant) {
    notFound();
  }

  return (
    <TenantShell tenantSlug={tenantSlug} tenantName={tenant.name}>
      {children}
    </TenantShell>
  );
}
