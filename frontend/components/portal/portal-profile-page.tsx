"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PortalPageError, PortalPageLoading } from "@/components/portal/portal-page-state";
import { getPortalOrganization, getPortalProfile, updatePortalProfile } from "@/lib/api/portal";
import type { PortalOrganization, PortalUser } from "@/types/portal";

export function PortalProfilePage({ tenantSlug }: { tenantSlug: string }) {
  const [profile, setProfile] = useState<PortalUser | null>(null);
  const [org, setOrg] = useState<PortalOrganization | null>(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = () => {
    setLoading(true);
    void Promise.all([getPortalProfile(tenantSlug), getPortalOrganization(tenantSlug)])
      .then(([p, o]) => {
        setProfile(p);
        setOrg(o);
        setFullName(p.full_name);
        setJobTitle(p.job_title ?? "");
        setPhone(p.phone ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load profile"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [tenantSlug]);

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updatePortalProfile(tenantSlug, {
        full_name: fullName.trim(),
        job_title: jobTitle.trim() || null,
        phone: phone.trim() || null,
      });
      setProfile(updated);
      setEditing(false);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PortalPageLoading label="Loading profile…" />;
  if (!profile) return <PortalPageError message={error ?? "Profile not found"} />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Profile</h1>
        {!editing ? (
          <Button variant="outline" onClick={() => setEditing(true)}>
            Edit profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button className="bg-sky-600 hover:bg-sky-700" disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        )}
      </div>

      {error && <PortalPageError message={error} />}
      {saved && (
        <p className="text-sm text-emerald-600">Profile updated successfully.</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {editing ? (
            <>
              <div>
                <Label>Full name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div>
                <Label>Job title</Label>
                <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <p>
                <span className="text-[var(--muted-foreground)]">Name:</span> {profile.full_name}
              </p>
              <p>
                <span className="text-[var(--muted-foreground)]">Email:</span> {profile.email}
              </p>
              <p>
                <span className="text-[var(--muted-foreground)]">Title:</span>{" "}
                {profile.job_title || "—"}
              </p>
              <p>
                <span className="text-[var(--muted-foreground)]">Phone:</span>{" "}
                {profile.phone || "—"}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-[var(--muted-foreground)]">Portal:</span> {profile.tenant_name}
          </p>
          <p>
            <span className="text-[var(--muted-foreground)]">Company:</span>{" "}
            {org?.company_name ?? profile.company_name ?? "—"}
          </p>
          {org && (
            <>
              <p>
                <span className="text-[var(--muted-foreground)]">Primary contact:</span>{" "}
                {org.contact_name}
              </p>
              <p>
                <span className="text-[var(--muted-foreground)]">Contact email:</span>{" "}
                {org.contact_email}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
