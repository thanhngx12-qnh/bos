import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/axios";
import { useEffect } from "react";
import { App } from "antd";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface PaginatedNotifications {
  data: Notification[];
  total: number;
}

export function useNotificationsList(page = 1, limit = 10, enabled = true) {
  return useQuery<PaginatedNotifications>({
    queryKey: ["notifications", page, limit],
    queryFn: async () => {
      const { data } = await api.get<any>("/api/v1/notifications", {
        params: { page, limit },
      });
      if (Array.isArray(data)) {
        return { data, total: data.length };
      }
      return {
        data: data.data || [],
        total: data.meta?.total ?? data.total ?? 0,
      };
    },
    enabled,
  });
}

export function useUnreadNotificationsCount(userId: number | null) {
  return useQuery<{ count: number }>({
    queryKey: ["notifications", "unread-count", userId],
    queryFn: async () => {
      const { data } = await api.get<{ count: number }>("/api/v1/notifications/unread-count");
      return data;
    },
    enabled: !!userId,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch(`/api/v1/notifications/${id}/read`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.patch("/api/v1/notifications/read-all");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useRealtimeNotifications(userId: number | null, tenantId: number | null) {
  const queryClient = useQueryClient();
  const { notification: antdNotification } = App.useApp();

  useEffect(() => {
    if (!userId) return;

    const token = localStorage.getItem("bos_token");
    if (!token) return;

    const tenantParam = tenantId !== null ? `&tenantId=${tenantId}` : "";
    const sseUrl = `${API_URL}/api/v1/notifications/stream?token=${token}${tenantParam}`;

    console.log(`[SSE CONNECTING] Connecting to ${sseUrl}`);
    const eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const notificationData: Notification = JSON.parse(event.data);
        console.log("[SSE MESSAGE RECEIVED]", notificationData);

        // Hiển thị toast thông báo realtime
        antdNotification.info({
          message: notificationData.title || "Thông báo mới",
          description: notificationData.message,
          placement: "topRight",
          duration: 5,
        });

        // Tự động làm mới cache các danh sách
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        queryClient.invalidateQueries({ queryKey: ["myTasks"] });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
      } catch (err) {
        console.error("Error parsing SSE notification:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("[SSE ERROR]", err);
      eventSource.close();
    };

    return () => {
      console.log("[SSE CLOSE] Closing eventSource connection");
      eventSource.close();
    };
  }, [userId, tenantId, queryClient, antdNotification]);
}
