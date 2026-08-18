import type { ApiRequestOptions } from "@karigo/config";
import type { DeviceTokenMetadata, NotificationSummary, RegisterDeviceTokenRequest } from "@karigo/shared-types";
import { api } from "./client";
import { captainGetOptions } from "./reliable-get";
export const notificationsApi = {
  list: (isRead?: boolean, options?: ApiRequestOptions) => api.get<NotificationSummary[]>(`notifications${isRead === undefined ? "" : `?isRead=${isRead}`}`, captainGetOptions(options)),
  unreadCount: (options?: ApiRequestOptions) => api.get<{ count: number }>("notifications/unread-count", captainGetOptions(options)),
  markRead: (id: string) => api.patch<NotificationSummary>(`notifications/${id}/read`),
  markAllRead: () => api.patch<{ updatedCount: number }>("notifications/read-all"),
  registerDeviceToken: (body: RegisterDeviceTokenRequest) =>
    api.post<DeviceTokenMetadata>("notifications/device-tokens", body),
  listDeviceTokens: (options?: ApiRequestOptions) => api.get<DeviceTokenMetadata[]>("notifications/device-tokens", captainGetOptions(options)),
  deactivateDeviceToken: (id: string) => api.delete<DeviceTokenMetadata>(`notifications/device-tokens/${id}`)
};
