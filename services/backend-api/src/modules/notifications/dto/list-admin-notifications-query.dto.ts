import { IsDateString, IsEnum, IsOptional, IsUUID } from "class-validator";
import { NotificationChannel, NotificationType } from "@prisma/client";

export class ListAdminNotificationsQueryDto {
  @IsOptional() @IsEnum(NotificationChannel) channel?: NotificationChannel;
  @IsOptional() @IsEnum(NotificationType) type?: NotificationType;
  @IsOptional() @IsUUID() userId?: string;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
}
