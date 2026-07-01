"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMonthYear, formatWeekRange, shiftAnchor } from "@/lib/calendar-utils";
import type { CalendarView } from "@/types/calendar";

const VIEWS: { value: CalendarView; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
  { value: "agenda", label: "Agenda" },
  { value: "timeline", label: "Timeline" },
];

interface CalendarToolbarProps {
  view: CalendarView;
  anchor: Date;
  onViewChange: (view: CalendarView) => void;
  onAnchorChange: (date: Date) => void;
  onToday: () => void;
  onCreate: () => void;
  canCreate: boolean;
}

export function CalendarToolbar({
  view,
  anchor,
  onViewChange,
  onAnchorChange,
  onToday,
  onCreate,
  canCreate,
}: CalendarToolbarProps) {
  const label =
    view === "month"
      ? formatMonthYear(anchor)
      : view === "day"
        ? anchor.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" })
        : formatWeekRange(anchor);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onToday}>Today</Button>
        <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => onAnchorChange(shiftAnchor(view, anchor, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => onAnchorChange(shiftAnchor(view, anchor, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">{label}</h1>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-[var(--border)] p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              onClick={() => onViewChange(v.value)}
              className={`rounded-md px-3 py-1.5 text-sm ${view === v.value ? "bg-[var(--primary)] text-white" : "text-[var(--muted-foreground)] hover:bg-black/5"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
        {canCreate && (
          <Button size="sm" onClick={onCreate}>
            <Plus className="mr-1 h-4 w-4" /> New Meeting
          </Button>
        )}
      </div>
    </div>
  );
}
