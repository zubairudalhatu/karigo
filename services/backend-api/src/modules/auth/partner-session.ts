import { partnerOrderAccessHash } from "../vendor-dashboard-orders/vendor-order-access";
import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PassportStrategy, AuthGuard } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { compare } from "bcrypt";
import { Prisma } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthService } from "./auth.service";
import { normalizePhoneNumber } from "../../common/utils/phone.util";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";

export const PARTNER_ONBOARDING_AUDIENCE = "karigo-partner-onboarding";
export const partnerHash = (value: string) => createHash("sha256").update(value).digest("hex");
export type PartnerPrincipal = AuthenticatedUser & { partnerScope?: "onboarding"; partnerSessionId?: string };

@Injectable()
export class PartnerSessionService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly auth: AuthService) {}

  private eligible(user: { role: string; phoneVerified: boolean; deletedAt: Date | null; accountStatus: string } | null) {
    return user && !user.deletedAt && user.phoneVerified && ["PENDING", "ACTIVE"].includes(user.accountStatus)
      && ["VENDOR", "CUSTOMER", "RIDER"].includes(user.role);
  }

  async login(phoneNumber: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { phoneNumber: normalizePhoneNumber(phoneNumber) }, include: { vendor: true } });
    if (!this.eligible(user) || !user || !await compare(password, user.passwordHash)) throw new UnauthorizedException("Invalid phone number or password.");
    if (user.accountStatus === "ACTIVE" && user.vendor?.status === "ACTIVE" && !user.vendor.deletedAt) {
      const session = await this.auth.login({ phoneNumber: normalizePhoneNumber(phoneNumber), password });
      await this.prisma.partnerMobileSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
      if ("accessToken" in session && typeof session.accessToken === "string") {
        // A Partner sign-out tombstone must not collide with another login
        // issued for the same account in the same second.
        const payload = this.jwt.decode(session.accessToken) as { exp?: number } | null;
        const options = payload?.exp ? { expiresIn: Math.max(1, payload.exp - Math.floor(Date.now() / 1000)) } : {};
        return { ...session, accessToken: await this.jwt.signAsync({ sub: user.id, role: user.role, jti: randomBytes(16).toString("hex") }, options) };
      }
      return session;
    }
    return this.issue(user.id);
  }

  private async issue(userId: string, db: PrismaService | Prisma.TransactionClient = this.prisma) {
    const refreshToken = `po_${randomBytes(48).toString("base64url")}`;
    const session = await db.partnerMobileSession.create({ data: {
      userId, refreshHash: partnerHash(refreshToken), purpose: "ONBOARDING", expiresAt: new Date(Date.now() + 7 * 86400_000)
    } });
    return { user: await this.principal(userId, session.id, db), refreshToken,
      accessToken: await this.jwt.signAsync({ sub: userId, sid: session.id, scope: "partner-onboarding" }, { audience: PARTNER_ONBOARDING_AUDIENCE, expiresIn: "15m" }) };
  }

  async principal(userId: string, sessionId: string, db: PrismaService | Prisma.TransactionClient = this.prisma): Promise<PartnerPrincipal> {
    const session = await db.partnerMobileSession.findFirst({ where: { id: sessionId, userId, purpose: "ONBOARDING", revokedAt: null, expiresAt: { gt: new Date() } } });
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!session || !user || !this.eligible(user)) throw new UnauthorizedException("Partner onboarding session expired.");
    return { id: user.id, fullName: user.fullName, phoneNumber: user.phoneNumber!, email: user.email,
      role: user.role, adminRole: user.adminRole, accountStatus: user.accountStatus, phoneVerified: user.phoneVerified,
      partnerScope: "onboarding", partnerSessionId: session.id };
  }

  async refresh(refreshToken: string) {
    const found = await this.prisma.partnerMobileSession.findUnique({ where: { refreshHash: partnerHash(refreshToken) } });
    if (!found) throw new UnauthorizedException("Partner session expired.");
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${found.userId}))::text AS lock`;
      await this.principal(found.userId, found.id, tx);
      const claimed = await tx.partnerMobileSession.updateMany({ where: { id: found.id, revokedAt: null }, data: { revokedAt: new Date() } });
      if (claimed.count !== 1) throw new UnauthorizedException("Partner session expired.");
      return this.issue(found.userId, tx);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async logout(userId: string, accessToken?: string) {
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))::text AS lock`;
      await tx.partnerMobileSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
      if (accessToken) {
        const payload = this.jwt.decode(accessToken) as { exp?: number } | null;
        const expiresAt = payload?.exp ? new Date(payload.exp * 1000) : new Date("9999-01-01T00:00:00Z");
        const refreshHash = partnerOrderAccessHash(accessToken);
        await tx.partnerMobileSession.upsert({ where: { refreshHash }, create: { userId, refreshHash, purpose: "REVOKED_ACCESS", expiresAt }, update: {} });
      }
      await tx.deviceToken.deleteMany({ where: { userId, appSurface: "PARTNER_APP" } });
      return { loggedOut: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async verifiedPasswordTicket(phoneNumber: string, otp: string) {
    const result = await this.auth.verifyApplicantOtp("VENDOR", { phoneNumber, otp });
    const user = await this.prisma.user.findUnique({ where: { phoneNumber: normalizePhoneNumber(phoneNumber) } });
    if (!user || !this.eligible(user)) throw new UnauthorizedException("Verification failed.");
    const ticket = randomBytes(32).toString("base64url");
    await this.prisma.partnerMobileSession.create({ data: { userId: user.id, purpose: "PASSWORD", refreshHash: partnerHash(ticket), expiresAt: new Date(Date.now() + 5 * 60_000) } });
    return { ...result, verificationTicket: ticket };
  }

  async setPassword(phoneNumber: string, password: string, verificationTicket: string) {
    if (password.length < 8 || password.length > 128) throw new BadRequestException("Use a password between 8 and 128 characters.");
    const user = await this.prisma.user.findUnique({ where: { phoneNumber: normalizePhoneNumber(phoneNumber) } });
    if (!user || !this.eligible(user) || user.role !== "VENDOR") throw new UnauthorizedException("Verification expired.");
    const proof = await this.prisma.partnerMobileSession.updateMany({ where: { userId: user.id, purpose: "PASSWORD", refreshHash: partnerHash(verificationTicket), revokedAt: null, expiresAt: { gt: new Date() } }, data: { revokedAt: new Date() } });
    if (proof.count !== 1) throw new UnauthorizedException("Verification expired. Verify your phone again.");
    await this.auth.createApplicantPassword("VENDOR", { phoneNumber, password });
    return { nextStep: "READY_FOR_APPLICATION" };
  }
}

@Injectable()
export class PartnerOnboardingStrategy extends PassportStrategy(Strategy, "partner-onboarding") {
  constructor(config: ConfigService, private readonly sessions: PartnerSessionService) {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_SECRET"), audience: PARTNER_ONBOARDING_AUDIENCE });
  }
  validate(payload: { sub: string; sid: string; scope: string }) {
    if (payload.scope !== "partner-onboarding" || !payload.sid) throw new UnauthorizedException();
    return this.sessions.principal(payload.sub, payload.sid);
  }
}

/** Used exclusively on own-onboarding/deletion endpoints, never merchant operations. */
@Injectable()
export class PartnerOnboardingGuard extends AuthGuard(["partner-onboarding", "jwt"]) {}
