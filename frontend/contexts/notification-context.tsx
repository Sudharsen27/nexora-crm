"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getNotificationsWsUrl } from "@/lib/api/notifications";
import { getUnreadCount } from "@/lib/api/notifications";
import { getAccessToken } from "@/lib/auth/tokens";
import { usePermissions } from "@/contexts/permissions-context";
import type { Notification } from "@/types/notification";

interface ToastItem {
  id: string;
  notification: Notification;
}

interface NotificationContextValue {
  unreadCount: number;
  toasts: ToastItem[];
  refreshUnread: () => Promise<void>;
  pushNotification: (notification: Notification) => void;
  dismissToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: ReactNode;
}) {
  const { can } = usePermissions();
  const canRead = can("notification:read");
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshUnread = useCallback(async () => {
    if (!canRead) return;
    try {
      const data = await getUnreadCount(tenantSlug);
      setUnreadCount(data.unread_count);
    } catch {
      /* silent */
    }
  }, [tenantSlug, canRead]);

  const pushNotification = useCallback((notification: Notification) => {
    setToasts((prev) => [{ id: notification.id, notification }, ...prev].slice(0, 5));
    if (!notification.read) {
      setUnreadCount((c) => c + 1);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (!canRead) return;
    void refreshUnread();
  }, [canRead, refreshUnread]);

  useEffect(() => {
    if (!canRead) return;

    function connect() {
      const token = getAccessToken();
      if (!token) return;
      const url = getNotificationsWsUrl(tenantSlug, token);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data as string) as {
            event: string;
            data?: Notification;
            unread_count?: number;
          };
          if (payload.event === "connected" && payload.unread_count != null) {
            setUnreadCount(payload.unread_count);
          }
          if (payload.event === "notification" && payload.data) {
            pushNotification(payload.data);
          }
        } catch {
          /* ignore */
        }
      };

      ws.onclose = () => {
        reconnectRef.current = setTimeout(connect, 8000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [tenantSlug, canRead, pushNotification]);

  useEffect(() => {
    const timers = toasts.map((toast) =>
      setTimeout(() => dismissToast(toast.id), 6000),
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismissToast]);

  const value = useMemo(
    () => ({ unreadCount, toasts, refreshUnread, pushNotification, dismissToast }),
    [unreadCount, toasts, refreshUnread, pushNotification, dismissToast],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotificationCenter() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotificationCenter must be used within NotificationProvider");
  }
  return ctx;
}
