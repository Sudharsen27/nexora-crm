"use client";

import { useEffect, useState } from "react";
import { getEmailStatistics } from "@/lib/api/emails";
import type { EmailStatistics } from "@/types/email";

interface EmailStatsWidgetProps {
  tenantSlug: string;
}

export function EmailStatsWidget({ tenantSlug }: EmailStatsWidgetProps) {
  const [stats, setStats] = useState<EmailStatistics | null>(null);

  useEffect(() => {
    getEmailStatistics(tenantSlug).then(setStats).catch(() => setStats(null));
  }, [tenantSlug]);

  if (!stats) return null;

  const items = [
    { label: "Unread", value: stats.unread_count },
    { label: "Sent today", value: stats.sent_today },
    { label: "Open rate", value: `${stats.open_rate}%` },
    { label: "Reply rate", value: `${stats.reply_rate}%` },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <p className="text-xs text-[var(--muted-foreground)]">{item.label}</p>
          <p className="mt-1 text-xl font-semibold">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
