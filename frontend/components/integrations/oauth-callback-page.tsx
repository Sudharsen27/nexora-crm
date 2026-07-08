"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { completeOAuthCallback } from "@/lib/api/integrations";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";

interface OAuthCallbackPageProps {
  tenantSlug: string;
}

export function OAuthCallbackPage({ tenantSlug }: OAuthCallbackPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const state = searchParams.get("state") ?? sessionStorage.getItem("oauth_state") ?? "";
    const code = searchParams.get("code") ?? "demo";
    if (!state) {
      setError("Missing OAuth state");
      return;
    }
    void (async () => {
      try {
        const detail = await completeOAuthCallback(tenantSlug, state, code);
        sessionStorage.removeItem("oauth_state");
        router.replace(`/${tenantSlug}/integrations/${detail.id}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "OAuth callback failed");
      }
    })();
  }, [tenantSlug, searchParams, router]);

  if (error) return <WidgetError title="OAuth failed" message={error} />;
  return <WidgetSkeleton variant="chart" />;
}
