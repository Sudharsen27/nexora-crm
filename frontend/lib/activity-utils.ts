import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle,
  CheckSquare,
  FileText,
  GitBranch,
  Key,
  LogIn,
  Mail,
  Phone,
  RotateCcw,
  Trophy,
  User,
  UserPlus,
  XCircle,
  Activity as ActivityIcon,
} from "lucide-react";
import type { Activity } from "@/types/api";

export const ACTION_ICON_MAP: Record<string, LucideIcon> = {
  building: Building2,
  user: User,
  "user-plus": UserPlus,
  "user-check": UserPlus,
  briefcase: Briefcase,
  "git-branch": GitBranch,
  trophy: Trophy,
  "x-circle": XCircle,
  "check-square": CheckSquare,
  "check-circle": CheckCircle,
  "rotate-ccw": RotateCcw,
  "file-text": FileText,
  "log-in": LogIn,
  key: Key,
  phone: Phone,
  calendar: Calendar,
  mail: Mail,
  "arrow-right": ArrowRight,
  activity: ActivityIcon,
};

export const ACTION_COLOR_CLASSES: Record<string, string> = {
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
  cyan: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300",
  violet: "bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-300",
  green: "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300",
  red: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  indigo: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300",
  slate: "bg-slate-100 text-slate-800 dark:bg-slate-800/50 dark:text-slate-300",
  zinc: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-300",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300",
  purple: "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300",
};

export type DateGroup = "Today" | "Yesterday" | "This Week" | "Earlier";

export function getDateGroup(isoDate: string): DateGroup {
  const date = new Date(isoDate);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 7);

  if (date >= startOfToday) return "Today";
  if (date >= startOfYesterday) return "Yesterday";
  if (date >= startOfWeek) return "This Week";
  return "Earlier";
}

export function groupActivitiesByDate(activities: Activity[]): { group: DateGroup; items: Activity[] }[] {
  const order: DateGroup[] = ["Today", "Yesterday", "This Week", "Earlier"];
  const buckets = new Map<DateGroup, Activity[]>();
  for (const activity of activities) {
    const group = getDateGroup(activity.created_at);
    if (!buckets.has(group)) buckets.set(group, []);
    buckets.get(group)!.push(activity);
  }
  return order.filter((g) => buckets.has(g)).map((group) => ({ group, items: buckets.get(group)! }));
}

export function getActivityIcon(activity: Activity): LucideIcon {
  if (activity.icon && ACTION_ICON_MAP[activity.icon]) {
    return ACTION_ICON_MAP[activity.icon];
  }
  return ActivityIcon;
}

export function getActivityColorClass(activity: Activity): string {
  return ACTION_COLOR_CLASSES[activity.color ?? "zinc"] ?? ACTION_COLOR_CLASSES.zinc;
}

export function getActorName(activity: Activity): string {
  return activity.actor?.full_name ?? activity.created_by?.full_name ?? "System";
}

export function getActorInitials(activity: Activity): string {
  const name = getActorName(activity);
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/** Minimal shape for icon/color lookup outside full Activity API responses. */
export function getActivityIconFromFields(icon: string | null | undefined): LucideIcon {
  if (icon && ACTION_ICON_MAP[icon]) return ACTION_ICON_MAP[icon];
  return ActivityIcon;
}

export function getDashboardActivityTitle(item: {
  title?: string | null;
  action?: string | null;
  activity_type: string;
}): string {
  if (item.title) return item.title;
  const key = item.action ?? item.activity_type;
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
