"use client";

import {
  Calendar,
  Headphones,
  Laptop,
  Megaphone,
  Phone,
  Presentation,
  Users,
  Video,
} from "lucide-react";
import { MEETING_STATUS_LABELS, MEETING_TYPE_COLORS, MEETING_TYPE_LABELS } from "@/lib/api/meetings";
import { formatMeetingTime } from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";
import type { CalendarEvent, Meeting } from "@/types/calendar";

const TYPE_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  online_meeting: Video,
  client_meeting: Users,
  demo: Laptop,
  sales_meeting: Megaphone,
  follow_up: Phone,
  internal_meeting: Users,
  presentation: Presentation,
  interview: Users,
  support: Headphones,
};

interface MeetingCardProps {
  event: CalendarEvent | Meeting;
  compact?: boolean;
  onClick?: () => void;
  className?: string;
}

export function MeetingCard({ event, compact, onClick, className }: MeetingCardProps) {
  const Icon = TYPE_ICONS[event.meeting_type] ?? Calendar;
  const colorClass = MEETING_TYPE_COLORS[event.meeting_type] ?? MEETING_TYPE_COLORS.client_meeting;
  const cancelled = event.status === "cancelled";
  const completed = event.status === "completed";
  const interactive = Boolean(onClick);

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={cn(
        "w-full rounded-lg border px-2 py-1.5 text-left transition",
        colorClass,
        cancelled && "opacity-50 line-through",
        completed && "opacity-70",
        compact ? "text-xs" : "text-sm",
        interactive && "cursor-pointer hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start gap-1.5">
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{event.title}</p>
          <p className="truncate opacity-80">{formatMeetingTime(event.start_datetime, event.end_datetime)}</p>
          {!compact && (
            <p className="truncate text-[11px] opacity-70">
              {MEETING_TYPE_LABELS[event.meeting_type]} · {MEETING_STATUS_LABELS[event.status]}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
