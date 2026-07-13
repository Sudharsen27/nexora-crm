import type { LucideIcon } from "lucide-react";
import {
  AtSign,
  AlertTriangle,
  BarChart2,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Gauge,
  GitBranch,
  Key,
  LogIn,
  Mail,
  MailCheck,
  MailX,
  Megaphone,
  Plug,
  RefreshCw,
  Reply,
  Shield,
  Target,
  TrendingUp,
  Trophy,
  User,
  UserPlus,
  Webhook,
  XCircle,
  CloudOff,
  Download,
  Flag,
  HardDrive,
} from "lucide-react";
import type { Notification } from "@/types/notification";

export type NotificationDateGroup = "Today" | "Yesterday" | "This Week" | "Earlier";

const TYPE_ICONS: Record<string, LucideIcon> = {
  lead_assigned: UserPlus,
  lead_converted: UserPlus,
  deal_created: Briefcase,
  deal_won: Trophy,
  deal_lost: XCircle,
  deal_stage_changed: GitBranch,
  task_assigned: Clock,
  task_completed: CheckCircle,
  task_due_tomorrow: Clock,
  meeting_scheduled: Calendar,
  meeting_reminder: Calendar,
  meeting_rescheduled: Calendar,
  meeting_cancelled: XCircle,
  meeting_completed: CheckCircle,
  meeting_started: Calendar,
  meeting_participant_added: UserPlus,
  email_received: Mail,
  email_delivered: MailCheck,
  email_failed: MailX,
  email_reply_received: Reply,
  email_scheduled: Clock,
  company_created: Building2,
  contact_added: User,
  note_added: FileText,
  comment_mention: AtSign,
  user_invited: UserPlus,
  password_changed: Key,
  password_reset: Key,
  login_new_device: Shield,
  system_announcement: Megaphone,
  report_ready: BarChart2,
  forecast_updated: TrendingUp,
  revenue_alert: DollarSign,
  target_achieved: Target,
  goal_missed: AlertTriangle,
  integration_connected: Plug,
  integration_failed: Plug,
  sync_failed: RefreshCw,
  sync_completed: CheckCircle,
  webhook_failed: Webhook,
  api_limit_reached: Gauge,
  push_enabled: Bell,
  offline_mode: CloudOff,
  app_update_available: Download,
  security_alert: Shield,
  feature_flag_updated: Flag,
  storage_limit_reached: HardDrive,
};

const PRIORITY_CLASSES: Record<string, string> = {
  low: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  normal: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
  high: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
  urgent: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
};

export function getNotificationIcon(notification: Notification): LucideIcon {
  return TYPE_ICONS[notification.type] ?? Bell;
}

export function getPriorityClass(priority: string): string {
  return PRIORITY_CLASSES[priority] ?? PRIORITY_CLASSES.normal;
}

export function getDateGroup(isoDate: string): NotificationDateGroup {
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

export function groupNotificationsByDate(
  items: Notification[],
): { group: NotificationDateGroup; items: Notification[] }[] {
  const order: NotificationDateGroup[] = ["Today", "Yesterday", "This Week", "Earlier"];
  const buckets = new Map<NotificationDateGroup, Notification[]>();
  for (const item of items) {
    const group = getDateGroup(item.created_at);
    if (!buckets.has(group)) buckets.set(group, []);
    buckets.get(group)!.push(item);
  }
  return order.filter((g) => buckets.has(g)).map((group) => ({ group, items: buckets.get(group)! }));
}
