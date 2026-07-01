import { NotificationChannel, NotificationType } from "@prisma/client";

export interface ExternalNotificationRequest {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  channel: NotificationChannel;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationProvider {
  readonly channel: NotificationChannel;
  send(request: ExternalNotificationRequest): Promise<{ accepted: boolean; provider: string }>;
}
