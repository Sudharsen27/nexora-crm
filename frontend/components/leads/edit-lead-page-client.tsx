"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LeadForm } from "@/components/leads/lead-form";
import { getLead, getLeadMeta, updateLead } from "@/lib/api/leads";
import { listMembers } from "@/lib/api/tenants";
import type { Lead, LeadMeta, Member } from "@/types/api";

interface EditLeadPageClientProps {
  tenantSlug: string;
  leadId: string;
}

export function EditLeadPageClient({ tenantSlug, leadId }: EditLeadPageClientProps) {
  const router = useRouter();
  const [meta, setMeta] = useState<LeadMeta | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [lead, setLead] = useState<Lead | null>(null);

  useEffect(() => {
    void Promise.all([getLeadMeta(tenantSlug), listMembers(tenantSlug), getLead(tenantSlug, leadId)]).then(
      ([metaData, memberData, leadData]) => {
        setMeta(metaData);
        setMembers(memberData);
        setLead(leadData);
      },
    );
  }, [tenantSlug, leadId]);

  if (!meta || !lead) {
    return <p className="text-zinc-500">Loading...</p>;
  }

  return (
    <LeadForm
      meta={meta}
      members={members}
      submitLabel="Save changes"
      initial={{
        first_name: lead.first_name,
        last_name: lead.last_name,
        email: lead.email ?? "",
        phone: lead.phone ?? "",
        company: lead.company ?? "",
        job_title: lead.job_title ?? "",
        status: lead.status,
        source: lead.source ?? "",
        estimated_value: lead.estimated_value ?? "",
        notes: lead.notes ?? "",
        assigned_to_id: lead.assigned_to_id ?? "",
      }}
      onSubmit={async (data) => {
        await updateLead(tenantSlug, leadId, data);
        router.push(`/${tenantSlug}/leads/${leadId}`);
      }}
      onCancel={() => router.push(`/${tenantSlug}/leads/${leadId}`)}
    />
  );
}
