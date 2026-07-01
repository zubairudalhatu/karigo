import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { RolesGuard } from "../../common/guards/roles.guard";
import { UsersModule } from "../users/users.module";
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
