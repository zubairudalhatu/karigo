import { Global, Module } from "@nestjs/common";
import { AdminRolesGuard } from "../../common/guards/admin-roles.guard";
import { AuthModule } from "../auth/auth.module";
import { AdminNotificationsController } from "./admin-notifications.controller";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { SmsNotificationProvider } from "./providers/external-placeholder.providers";
import { PushNotificationProvider } from "./providers/push-notification.provider";
import { EmailNotificationProvider } from "./providers/email-notification.provider";
import { WhatsAppNotificationProvider } from "./providers/whatsapp-notification.provider";
import { MockNotificationProvider } from "./providers/mock-notification.provider";
import { EmailService } from "./email/email.service";
import { EmailProviderRegistry } from "./email/providers/email-provider.registry";
import { MockEmailProvider } from "./email/providers/mock-email.provider";
import { MailgunEmailProvider, SendGridEmailProvider, SesEmailProvider, SmtpEmailProvider } from "./email/providers/placeholder-email.providers";
import { WhatsAppService } from "./whatsapp/whatsapp.service";
import { WhatsAppProviderRegistry } from "./whatsapp/providers/whatsapp-provider.registry";
import { MockWhatsAppProvider } from "./whatsapp/providers/mock-whatsapp.provider";
import { MetaWhatsAppCloudProvider } from "./whatsapp/providers/meta-whatsapp-cloud.provider";
import { DeviceTokensService } from "./device-tokens.service";
import { PushService } from "./push/push.service";
import { PushProviderRegistry } from "./push/providers/push-provider.registry";
import { MockPushProvider } from "./push/providers/mock-push.provider";
import { ExpoPushProvider } from "./push/providers/expo-push.provider";
import { FirebasePushProvider } from "./push/providers/firebase-push.provider";

@Global()
@Module({
  imports: [AuthModule],
  controllers: [NotificationsController, AdminNotificationsController],
  providers: [
    NotificationsService,
    DeviceTokensService,
    EmailService,
    EmailProviderRegistry,
    MockEmailProvider,
    SmtpEmailProvider,
    SendGridEmailProvider,
    MailgunEmailProvider,
    SesEmailProvider,
    WhatsAppService,
    WhatsAppProviderRegistry,
    MockWhatsAppProvider,
    MetaWhatsAppCloudProvider,
    PushService,
    PushProviderRegistry,
    MockPushProvider,
    ExpoPushProvider,
    FirebasePushProvider,
    MockNotificationProvider,
    SmsNotificationProvider,
    EmailNotificationProvider,
    WhatsAppNotificationProvider,
    PushNotificationProvider,
    AdminRolesGuard
  ],
  exports: [NotificationsService, EmailService, WhatsAppService, PushService]
})
export class NotificationsModule {}
