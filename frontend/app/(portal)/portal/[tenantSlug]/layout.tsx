"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PortalShell } from "@/components/portal/portal-shell";
import { getPortalProfile } from "@/lib/api/portal";
import { getPortalAccessToken } from "@/lib/auth/portal-tokens";

export default function PortalTenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [tenantName, setTenantName] = useState("Portal");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void params.then(async ({ tenantSlug: slug }) => {
      if (cancelled) return;
      setTenantSlug(slug);
      setError(null);

      if (!getPortalAccessToken()) {
        router.replace("/portal/login");
        return;
      }

      try {
        const profile = await getPortalProfile(slug);
        if (cancelled) return;
        setTenantName(profile.tenant_name);
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load portal session");
        setReady(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [params, pathname, router]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-rose-600">{error}</p>
        <button
          type="button"
          className="text-sm text-sky-600 hover:underline"
          onClick={() => router.push("/portal/login")}
        >
          Back to portal login
        </button>
      </div>
    );
  }

  if (!ready || !tenantSlug) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-[var(--muted-foreground)]">
        Loading portal…
      </div>
    );
  }

  return (
    <PortalShell tenantSlug={tenantSlug} tenantName={tenantName}>
      {children}
    </PortalShell>
  );
}
