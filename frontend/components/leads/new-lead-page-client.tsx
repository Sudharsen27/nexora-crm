"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LeadForm } from "@/components/leads/lead-form";
import { createLead, getLeadMeta } from "@/lib/api/leads";
import { listMembers } from "@/lib/api/tenants";
import type { LeadMeta, Member } from "@/types/api";

interface NewLeadPageClientProps {
  tenantSlug: string;
}

export function NewLeadPageClient({ tenantSlug }: NewLeadPageClientProps) {
  const router = useRouter();
  const [meta, setMeta] = useState<LeadMeta | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    void Promise.all([getLeadMeta(tenantSlug), listMembers(tenantSlug)]).then(
      ([metaData, memberData]) => {
        setMeta(metaData);
        setMembers(memberData);
      },
    );
  }, [tenantSlug]);

  if (!meta) {
    return <p className="text-zinc-500">Loading...</p>;
  }

  return (
    <LeadForm
      meta={meta}
      members={members}
      submitLabel="Create lead"
      onSubmit={async (data) => {
        await createLead(tenantSlug, data);
        router.push(`/${tenantSlug}/leads`);
      }}
      onCancel={() => router.push(`/${tenantSlug}/leads`)}
    />
  );
}
