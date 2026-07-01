"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EmailDetailView } from "@/components/emails/email-detail-view";
import { WidgetError, WidgetSkeleton } from "@/components/dashboard/widget-states";
import { getEmail } from "@/lib/api/emails";
import type { Email } from "@/types/email";

interface EmailDetailPageProps {
  tenantSlug: string;
  emailId: string;
}

export function EmailDetailPage({ tenantSlug, emailId }: EmailDetailPageProps) {
  const [email, setEmail] = useState<Email | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setEmail(await getEmail(tenantSlug, emailId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load email");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [tenantSlug, emailId]);

  if (loading) return <WidgetSkeleton variant="list" />;
  if (error || !email) {
    return <WidgetError title="Email unavailable" message={error ?? "Not found"} onRetry={() => void load()} />;
  }

  return (
    <div className="space-y-4">
      <Link
        href={`/${tenantSlug}/emails`}
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Email Center
      </Link>
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <EmailDetailView tenantSlug={tenantSlug} email={email} onChanged={() => void load()} />
      </div>
    </div>
  );
}
