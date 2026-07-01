import type { NotificationSummary } from "@karigo/shared-types";
import { api } from "./client";
export const notificationsApi = { list: () => api.get<NotificationSummary[]>("notifications"), unreadCount: () => api.get<{ count: number }>("notifications/unread-count"), markRead: (id: string) => api.patch<NotificationSummary>(`notifications/${id}/read`), markAllRead: () => api.patch<{ updatedCount: number }>("notifications/read-all") };
