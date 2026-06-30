"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WidgetEmpty } from "@/components/dashboard/widget-states";

const COLORS = ["var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

interface TaskCompletionChartProps {
  completed: number;
  open: number;
  overdue: number;
  completionRate?: number | null;
}

export function TaskCompletionChart({
  completed,
  open,
  overdue,
  completionRate,
}: TaskCompletionChartProps) {
  const data = [
    { name: "Completed", value: completed },
    { name: "Open", value: open },
    { name: "Overdue", value: overdue },
  ].filter((d) => d.value > 0);
  const total = completed + open + overdue;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Task completion</CardTitle>
        <CardDescription>
          {completionRate != null ? `${completionRate}% completion rate` : "Task status breakdown"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <WidgetEmpty title="No tasks" description="Tasks will appear here once created." />
        ) : (
          <div className="flex items-center gap-4">
            <div className="relative h-40 w-40 shrink-0" role="img" aria-label="Task completion radial chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    innerRadius={48}
                    outerRadius={64}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold tabular-nums">{completionRate ?? 0}%</span>
                <span className="text-xs text-[var(--muted-foreground)]">done</span>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              {data.map((item, i) => (
                <li key={item.name} className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-[var(--muted-foreground)]">{item.name}</span>
                  <span className="ml-auto font-medium tabular-nums">{item.value}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
