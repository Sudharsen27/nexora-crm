"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addMember, listMembers, listRoles, removeMember, updateMember } from "@/lib/api/tenants";
import type { Member, Role } from "@/types/api";

const addSchema = z.object({
  email: z.string().email(),
  role_id: z.string().uuid(),
});

type AddFormData = z.infer<typeof addSchema>;

interface TeamManagementProps {
  tenantSlug: string;
}

export function TeamManagement({ tenantSlug }: TeamManagementProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddFormData>({ resolver: zodResolver(addSchema) });

  async function loadData() {
    setLoading(true);
    try {
      const [memberList, roleList] = await Promise.all([
        listMembers(tenantSlug),
        listRoles(tenantSlug),
      ]);
      setMembers(memberList);
      setRoles(roleList.filter((role) => role.slug !== "owner"));
      reset({ role_id: roleList.find((r) => r.slug === "member")?.id ?? "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [tenantSlug]);

  async function onAddMember(data: AddFormData) {
    setError(null);
    try {
      await addMember(tenantSlug, data);
      reset();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add member");
    }
  }

  async function handleRoleChange(membershipId: string, roleId: string) {
    try {
      await updateMember(tenantSlug, membershipId, { role_id: roleId });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  async function handleRemove(membershipId: string) {
    if (!confirm("Remove this member from the organization?")) return;
    try {
      await removeMember(tenantSlug, membershipId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Team management</h2>
        <p className="text-zinc-500">Manage members and roles for your organization.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add member</CardTitle>
          <CardDescription>User must already have a Nexora account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onAddMember)} className="flex flex-wrap items-end gap-4">
            <div className="min-w-[220px] flex-1 space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="colleague@company.com" {...register("email")} />
              {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
            </div>
            <div className="w-40 space-y-2">
              <Label htmlFor="role_id">Role</Label>
              <select
                id="role_id"
                className="flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                {...register("role_id")}
              >
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              Add member
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>{loading ? "Loading..." : `${members.length} member(s)`}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-medium">{member.full_name}</p>
                  <p className="text-sm text-zinc-500">{member.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  {member.role_slug === "owner" ? (
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium dark:bg-zinc-800">
                      Owner
                    </span>
                  ) : (
                    <select
                      className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                      value={member.role_id}
                      onChange={(e) => handleRoleChange(member.id, e.target.value)}
                    >
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {member.role_slug !== "owner" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(member.id)}
                      aria-label={`Remove ${member.full_name}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
