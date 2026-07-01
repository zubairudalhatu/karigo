export interface NotificationSummary {
  id: string;
  title: string;
  message: string;
  channel: string;
  type: string;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export type DevicePlatform = "IOS" | "ANDROID" | "WEB";
export type PushProvider = "EXPO" | "FCM";
export type AppSurface = "CUSTOMER_APP" | "RIDER_APP" | "VENDOR_DASHBOARD" | "ADMIN_PORTAL";

export interface RegisterDeviceTokenRequest {
  token: string;
  platform: DevicePlatform;
  provider: PushProvider;
  appSurface: AppSurface;
  deviceId?: string;
}

export interface DeviceTokenMetadata {
  id: string;
  platform: DevicePlatform;
  provider: PushProvider;
  appSurface: AppSurface;
  isActive: boolean;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
}
