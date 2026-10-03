import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotificationType, PhoneChangeAssurance, PhoneChangeStatus, Prisma, UserRole } from "@prisma/client";
import { compare } from "bcrypt";
import { NIGERIAN_PHONE_PATTERN, normalizePhoneNumber } from "../../common/utils/phone.util";
import { PrismaService } from "../../prisma/prisma.service";
import { ConfirmPhoneChangeDto, StartPhoneChangeDto } from "./dto/phone-change.dto";
import { OtpService } from "./otp.service";

@Injectable()
export class PhoneChangeService {
  constructor(private readonly prisma: PrismaService, private readonly otp: OtpService, private readonly config: ConfigService) {}

  async start(userId: string, dto: StartPhoneChangeDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const passwordMatches = user ? await compare(dto.currentPassword, user.passwordHash) : false;
    if (!user || user.deletedAt || !passwordMatches) throw new BadRequestException("Identity confirmation failed.");
    if (user.role !== UserRole.CUSTOMER) {
      const recent = await this.prisma.phoneChangeRequest.findFirst({ where: { userId, status: PhoneChangeStatus.COMPLETED }, orderBy: { completedAt: "desc" }, select: { sensitiveActionsHoldUntil: true } });
      if (recent?.sensitiveActionsHoldUntil && recent.sensitiveActionsHoldUntil > new Date()) {
        throw new BadRequestException("Another phone-number change is temporarily unavailable for this account.");
      }
    }
    const newPhoneNumber = normalizePhoneNumber(dto.newPhoneNumber);
    if (!NIGERIAN_PHONE_PATTERN.test(newPhoneNumber)) throw new BadRequestException("Enter a valid Nigerian phone number.");
    if (newPhoneNumber === user.phoneNumber) throw new BadRequestException("Enter a different phone number.");
    if (await this.prisma.user.findUnique({ where: { phoneNumber: newPhoneNumber }, select: { id: true } })) {
      throw new BadRequestException("Phone change could not be started.");
    }
    await this.prisma.phoneChangeRequest.updateMany({ where: { userId, status: PhoneChangeStatus.PENDING_NEW_PHONE_VERIFICATION }, data: { status: PhoneChangeStatus.CANCELLED, cancelledAt: new Date() } });
    const expiresAt = new Date(Date.now() + this.config.get<number>("OTP_EXPIRY_MINUTES", 10) * 60_000);
    const request = await this.prisma.phoneChangeRequest.create({ data: {
      userId, oldPhoneNumber: user.phoneNumber, newPhoneNumber, expiresAt, assurance: PhoneChangeAssurance.RECENT_PASSWORD
    }});
    const verification = await this.otp.issue(userId, newPhoneNumber, { enforceCooldown: true, purpose: this.purpose(request.id) });
    await this.prisma.accountSecurityEvent.create({ data: { userId, action: "phone_change.requested", metadata: { requestId: request.id, assurance: request.assurance } } });
    return { requestId: request.id, newPhoneNumberMasked: this.mask(newPhoneNumber), expiresAt: verification.expiresAt, ...(this.exposeMockOtp() ? { mockOtp: verification.otp } : {}) };
  }

  async confirm(userId: string, dto: ConfirmPhoneChangeDto) {
    const request = await this.prisma.phoneChangeRequest.findFirst({ where: { id: dto.requestId, userId, status: PhoneChangeStatus.PENDING_NEW_PHONE_VERIFICATION } });
    if (!request || request.expiresAt <= new Date()) throw new BadRequestException("OTP is invalid or expired");
    await this.otp.verify(userId, dto.otp, this.purpose(request.id));
    const holdUntil = request.userId && (await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } }))?.role !== UserRole.CUSTOMER
      ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;
    try {
      await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.update({ where: { id: userId }, data: { phoneNumber: request.newPhoneNumber, phoneVerified: true } });
        if (user.role === UserRole.VENDOR) await tx.vendor.updateMany({ where: { userId }, data: { phoneNumber: request.newPhoneNumber } });
        if (user.role === UserRole.RIDER) await tx.rider.updateMany({ where: { userId }, data: { phoneNumber: request.newPhoneNumber } });
        await tx.phoneChangeRequest.update({ where: { id: request.id }, data: { status: PhoneChangeStatus.COMPLETED, verifiedAt: new Date(), completedAt: new Date(), sensitiveActionsHoldUntil: holdUntil } });
        await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
        await tx.accountSecurityEvent.create({ data: { userId, action: "phone_change.completed", metadata: { requestId: request.id, sessionsRevoked: true, sensitiveActionsHoldUntil: holdUntil?.toISOString() } } });
        await tx.notification.create({ data: { userId, title: "Phone number changed", message: "Your verified KariGO phone number was changed. Contact support immediately if this was not you.", type: NotificationType.SYSTEM_ALERT } });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictException("Phone change could not be completed.");
      throw error;
    }
    return { phoneChanged: true, sessionsRevoked: true, sensitiveActionsHoldUntil: holdUntil };
  }

  private purpose(id: string) { return `PHONE_CHANGE:${id}`; }
  private mask(phone: string) { return `${phone.slice(0, 4)}***${phone.slice(-4)}`; }
  private exposeMockOtp() { return this.config.get("OTP_PROVIDER", "mock") === "mock" && this.config.get("APP_ENV", "development") !== "production"; }
}
