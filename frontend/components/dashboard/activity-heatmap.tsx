"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WidgetEmpty } from "@/components/dashboard/widget-states";
import type { AnalyticsActivityHeatmapDay } from "@/types/analytics";
import { cn } from "@/lib/utils";

interface ActivityHeatmapProps {
  days: AnalyticsActivityHeatmapDay[];
}

export function ActivityHeatmap({ days }: ActivityHeatmapProps) {
  const max = Math.max(...days.map((d) => d.count), 1);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Activity heatmap</CardTitle>
        <CardDescription>Daily activity volume in selected period</CardDescription>
      </CardHeader>
      <CardContent>
        {!days.length ? (
          <WidgetEmpty title="No activity data" description="CRM actions will populate this heatmap." />
        ) : (
          <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-14" role="img" aria-label="Activity heatmap">
            {days.map((day) => {
              const intensity = day.count / max;
              return (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.count} activities`}
                  className={cn(
                    "aspect-square rounded-md border border-[var(--border)]/50 transition-colors",
                    intensity === 0 && "bg-[var(--surface-muted)]",
                    intensity > 0 && intensity < 0.34 && "bg-[var(--chart-1)]/20",
                    intensity >= 0.34 && intensity < 0.67 && "bg-[var(--chart-1)]/45",
                    intensity >= 0.67 && "bg-[var(--chart-1)]/75",
                  )}
                />
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
