import { Injectable } from "@nestjs/common";
import { NotificationChannel } from "@prisma/client";
import { PlaceholderNotificationProvider } from "./placeholder-notification.provider";

@Injectable() export class SmsNotificationProvider extends PlaceholderNotificationProvider { readonly channel = NotificationChannel.SMS; }
