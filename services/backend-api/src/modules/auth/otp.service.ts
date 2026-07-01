import { BadRequestException, HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { compare, hash } from "bcrypt";
import { randomInt } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { OtpProviderRegistry } from "./providers/otp-provider.registry";

const PHONE_VERIFICATION = "PHONE_VERIFICATION";

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly providers: OtpProviderRegistry
  ) {}

  async issue(userId: string, phoneNumber: string, options: { enforceCooldown?: boolean } = {}) {
    const length = this.config.get<number>("OTP_LENGTH", 6);
    const expiryMinutes = this.config.get<number>("OTP_EXPIRY_MINUTES", 10);
    const cooldownSeconds = this.config.get<number>("OTP_RESEND_COOLDOWN_SECONDS", 60);

    if (options.enforceCooldown) {
      const latest = await this.prisma.otpVerification.findFirst({
        where: { userId, purpose: PHONE_VERIFICATION },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true }
      });
      const retryAt = latest ? latest.createdAt.getTime() + cooldownSeconds * 1000 : 0;
      if (retryAt > Date.now()) {
        throw new HttpException(
          `Please wait ${Math.ceil((retryAt - Date.now()) / 1000)} seconds before requesting another OTP`,
          HttpStatus.TOO_MANY_REQUESTS
        );
      }
    }

    const otp = randomInt(0, 10 ** length).toString().padStart(length, "0");
    const codeHash = await hash(otp, 10);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    await this.prisma.otpVerification.updateMany({
      where: { userId, purpose: PHONE_VERIFICATION, verifiedAt: null },
      data: { verifiedAt: new Date() }
    });

    const verification = await this.prisma.otpVerification.create({
      data: {
        userId,
        purpose: PHONE_VERIFICATION,
        codeHash,
        expiresAt
      }
    });

    const provider = this.providers.active();
    try {
      await provider.sendOtp({
        phoneNumber,
        otpCode: otp,
        expiresAt,
        metadata: { userId, purpose: PHONE_VERIFICATION }
      });
    } catch (error) {
      await this.prisma.otpVerification.update({
        where: { id: verification.id },
        data: { verifiedAt: new Date() }
      });
      throw error;
    }

    return { otp, expiresAt, provider: provider.name };
  }

  async verify(userId: string, otp: string): Promise<void> {
    const verification = await this.prisma.otpVerification.findFirst({
      where: { userId, purpose: PHONE_VERIFICATION, verifiedAt: null },
      orderBy: { createdAt: "desc" }
    });

    if (!verification || verification.expiresAt <= new Date()) {
      throw new BadRequestException("OTP is invalid or expired");
    }

    const maxAttempts = this.config.get<number>("OTP_MAX_ATTEMPTS", 5);
    if (verification.attempts >= maxAttempts) {
      throw new BadRequestException("OTP attempt limit reached");
    }

    const matches = await compare(otp, verification.codeHash);
    if (!matches) {
      await this.prisma.otpVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } }
      });
      throw new BadRequestException("OTP is invalid or expired");
    }

    await this.prisma.otpVerification.update({
      where: { id: verification.id },
      data: { verifiedAt: new Date() }
    });
  }
}
