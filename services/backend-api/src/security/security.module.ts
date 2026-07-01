import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: { expiresIn: config.get<number>("JWT_EXPIRES_IN_SECONDS", 60 * 60 * 24 * 7) }
      })
    })
  ],
  exports: [JwtModule]
})
export class SecurityModule {}
