"use client";

import { Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const USAGE_HISTORY = [
  { action: "Revenue forecast", credits: 120, time: "2 hours ago" },
  { action: "Meeting summary", credits: 80, time: "Yesterday" },
  { action: "Risky deals analysis", credits: 95, time: "Yesterday" },
  { action: "Follow-up email draft", credits: 45, time: "2 days ago" },
];

export function AiUsagePanel() {
  const used = 2400;
  const total = 10000;
  const pct = Math.round((used / total) * 100);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white">
          <Zap className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold">AI Credits</h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Your organization&apos;s AI usage this billing period
        </p>
      </div>

      <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-indigo-500/5">
        <CardContent className="p-6 text-center">
          <p className="text-4xl font-bold tracking-tight">
            {(total - used).toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">credits remaining</p>
          <div className="mx-auto mt-4 h-2 max-w-xs overflow-hidden rounded-full bg-[var(--border)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-[var(--muted-foreground)]">
            {used.toLocaleString()} used · {total.toLocaleString()} total ({pct}%)
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Recent usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {USAGE_HISTORY.map((row) => (
            <div key={row.action} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium">{row.action}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{row.time}</p>
              </div>
              <span className="text-[var(--muted-foreground)]">-{row.credits}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
