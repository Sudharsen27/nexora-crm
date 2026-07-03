"use client";

import {
  AlertTriangle,
  Briefcase,
  Calendar,
  CheckSquare,
  Lightbulb,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const FORECAST_DATA = [
  { w: "W1", v: 42 },
  { w: "W2", v: 58 },
  { w: "W3", v: 71 },
  { w: "W4", v: 86 },
];

const RECOMMENDATIONS = [
  "Follow up with Acme — no activity in 12 days",
  "Globex demo prep: confirm integration scope",
  "3 tasks overdue — prioritize pipeline review",
];

interface AiRightPanelProps {
  tenantSlug: string;
}

export function AiRightPanel({ tenantSlug }: AiRightPanelProps) {
  void tenantSlug;

  return (
    <aside className="hidden w-[300px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-[var(--border)]/80 bg-[var(--surface)]/40 p-4 backdrop-blur-xl xl:flex sidebar-scroll">
      <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-indigo-500/5 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-violet-600" />
            Daily summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-[var(--muted-foreground)]">
          <p>4 meetings · 12 open tasks · 7 new leads</p>
          <p className="font-medium text-[var(--foreground)]">$428K forecast · 78% confidence</p>
        </CardContent>
      </Card>

      <Card className="border-[var(--border)]/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4" />
            Today&apos;s meetings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { time: "10:00", title: "Acme QBR" },
            { time: "16:00", title: "Globex demo" },
          ].map((m) => (
            <div key={m.title} className="flex gap-2 text-xs">
              <span className="font-medium text-violet-600">{m.time}</span>
              <span>{m.title}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-[var(--border)]/80 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Briefcase className="h-4 w-4" />
            Pipeline health
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold">72%</p>
              <p className="text-xs text-[var(--muted-foreground)]">Healthy</p>
            </div>
            <Badge variant="success">+4%</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[var(--border)]/80 shadow-sm">
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingUp className="h-4 w-4" />
            Sales forecast
          </CardTitle>
        </CardHeader>
        <CardContent className="h-24 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={FORECAST_DATA}>
              <Tooltip />
              <Area
                type="monotone"
                dataKey="v"
                stroke="var(--primary)"
                fill="var(--primary)"
                fillOpacity={0.12}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-[var(--border)]/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4" />
            Lead scoring
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span>Hot leads</span>
            <span className="font-semibold text-rose-600">5</span>
          </div>
          <div className="flex justify-between">
            <span>Warm</span>
            <span className="font-semibold">14</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-500/20 bg-amber-500/5 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Lightbulb className="h-4 w-4 text-amber-600" />
            Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {RECOMMENDATIONS.map((r) => (
            <p key={r} className="text-xs leading-relaxed text-[var(--muted-foreground)]">
              {r}
            </p>
          ))}
        </CardContent>
      </Card>

      <Card className="border-[var(--border)]/80 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CheckSquare className="h-4 w-4" />
            Upcoming tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-[var(--muted-foreground)]">
          <p>Pipeline review · Due today</p>
          <p className="mt-1">Send Globex proposal · Tomorrow</p>
        </CardContent>
      </Card>

      <Card className="border-rose-500/20 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            Risk detection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-[var(--muted-foreground)]">3 deals flagged as at-risk</p>
          <Badge variant="destructive" className="mt-2">
            $204K at risk
          </Badge>
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/50 p-3 text-center">
        <p className="text-xs font-medium">AI usage this month</p>
        <p className="mt-1 text-lg font-bold">2,400 / 10,000</p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
          <div className="h-full w-[24%] rounded-full bg-gradient-to-r from-violet-600 to-indigo-600" />
        </div>
      </div>
    </aside>
  );
}
