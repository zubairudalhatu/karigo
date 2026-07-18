import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { RolesGuard } from "../../common/guards/roles.guard";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { UsersModule } from "../users/users.module";
import { AccountActivationEmailService } from "./account-activation-email.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { OtpService } from "./otp.service";
import { AfricasTalkingOtpProvider } from "./providers/africas-talking-otp.provider";
import { MockOtpProvider } from "./providers/mock-otp.provider";
import { OtpProviderRegistry } from "./providers/otp-provider.registry";
import { TermiiOtpProvider } from "./providers/termii-otp.provider";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" }), UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccountActivationEmailService,
    ApplicationNotificationsService,
    OtpService,
    OtpProviderRegistry,
    MockOtpProvider,
    TermiiOtpProvider,
    AfricasTalkingOtpProvider,
    JwtStrategy,
    RolesGuard
  ],
  exports: [AuthService, RolesGuard]
})
export class AuthModule {}
