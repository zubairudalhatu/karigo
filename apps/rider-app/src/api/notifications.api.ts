import type { DeviceTokenMetadata, NotificationSummary, RegisterDeviceTokenRequest } from "@karigo/shared-types";
import { api } from "./client";
export const notificationsApi = {
  list: (isRead?: boolean) => api.get<NotificationSummary[]>(`notifications${isRead === undefined ? "" : `?isRead=${isRead}`}`),
  unreadCount: () => api.get<{ count: number }>("notifications/unread-count"),
  markRead: (id: string) => api.patch<NotificationSummary>(`notifications/${id}/read`),
  markAllRead: () => api.patch<{ updatedCount: number }>("notifications/read-all"),
  registerDeviceToken: (body: RegisterDeviceTokenRequest) =>
    api.post<DeviceTokenMetadata>("notifications/device-tokens", body),
  listDeviceTokens: () => api.get<DeviceTokenMetadata[]>("notifications/device-tokens"),
  deactivateDeviceToken: (id: string) => api.delete<DeviceTokenMetadata>(`notifications/device-tokens/${id}`)
};
