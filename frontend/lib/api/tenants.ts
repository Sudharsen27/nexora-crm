import { apiFetch } from "@/lib/api/client";
import type { Member, Role, Tenant } from "@/types/api";

export async function listTenants(): Promise<Tenant[]> {
  const data = await apiFetch<{ items: Tenant[] }>("/tenants");
  return data.items;
}

export async function createTenant(data: {
  name: string;
  slug: string;
}): Promise<Tenant> {
  return apiFetch<Tenant>("/tenants", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getTenant(slug: string): Promise<Tenant> {
  return apiFetch<Tenant>(`/tenants/${slug}`);
}

export async function getTenantPermissions(slug: string): Promise<{
  role: string;
  role_name: string;
  permissions: string[];
}> {
  return apiFetch<{ role: string; role_name: string; permissions: string[] }>(
    `/tenants/${slug}/permissions`,
  );
}

export async function listMembers(slug: string): Promise<Member[]> {
  const data = await apiFetch<{ items: Member[] }>(`/tenants/${slug}/users`);
  return data.items;
}

export async function addMember(
  slug: string,
  data: { email: string; role_id: string },
): Promise<Member> {
  return apiFetch<Member>(`/tenants/${slug}/users`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateMember(
  slug: string,
  membershipId: string,
  data: { role_id?: string; status?: string },
): Promise<Member> {
  return apiFetch<Member>(`/tenants/${slug}/users/${membershipId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function removeMember(slug: string, membershipId: string): Promise<void> {
  await apiFetch<void>(`/tenants/${slug}/users/${membershipId}`, {
    method: "DELETE",
  });
}

export async function listRoles(slug: string): Promise<Role[]> {
  const data = await apiFetch<{ items: Role[] }>(`/tenants/${slug}/roles`);
  return data.items;
}
