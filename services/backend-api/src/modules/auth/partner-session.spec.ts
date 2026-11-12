import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { hash } from "bcrypt";
import { PartnerSessionService, PartnerOnboardingStrategy, PARTNER_ONBOARDING_AUDIENCE } from "./partner-session";
import { JwtStrategy } from "./jwt.strategy";
import { AuthService } from "./auth.service";
import { UsersService } from "../users/users.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("Partner restricted session boundary", () => {
  const jwt = new JwtService({ secret: "synthetic-partner-test-secret-only" });
  const config = { getOrThrow: () => "synthetic-partner-test-secret-only" } as unknown as ConfigService;
  let user: any, db: any, auth: any, service: PartnerSessionService;
  beforeEach(async () => {
    user = { id: "synthetic-user", role: "VENDOR", fullName: "Test applicant", phoneNumber: "+2348000000000", email: null, phoneVerified: true,
      deletedAt: null, accountStatus: "PENDING", passwordHash: await hash("synthetic-password", 4), vendor: null };
    const sessions: any[] = [];
    db = { user: { findUnique: jest.fn(async () => user) }, deviceToken: { deleteMany: jest.fn() }, partnerMobileSession: {
      create: jest.fn(async ({ data }) => { const row = { id: `s-${sessions.length}`, revokedAt: null, ...data }; sessions.push(row); return row; }),
      findFirst: jest.fn(async ({ where }) => sessions.find(s => s.id === where.id && s.userId === where.userId && s.purpose === where.purpose && !s.revokedAt && s.expiresAt > new Date())),
      findUnique: jest.fn(async ({ where }) => sessions.find(s => s.refreshHash === where.refreshHash)),
      updateMany: jest.fn(async ({ where, data }) => { let count = 0; for (const s of sessions) if ((!where.id || s.id === where.id) && (!where.userId || s.userId === where.userId)
        && (!where.purpose || s.purpose === where.purpose) && (!where.refreshHash || s.refreshHash === where.refreshHash) && !s.revokedAt) { Object.assign(s, data); count++; } return { count }; })
    } };
    db.$transaction = async (operation: any) => operation(db); db.$queryRaw = jest.fn();
    auth = { login: jest.fn(async () => ({ approved: true })), createApplicantPassword: jest.fn(), verifyApplicantOtp: jest.fn(async () => ({ nextStep: "PASSWORD_REQUIRED" })) };
    service = new PartnerSessionService(db as PrismaService, jwt, auth as AuthService);
  });
  it("never issues a session to an unverified applicant", async () => {
    user.phoneVerified = false; await expect(service.login(user.phoneNumber, "synthetic-password")).rejects.toThrow();
    expect(db.partnerMobileSession.create).not.toHaveBeenCalled();
  });
  it.each(["DEACTIVATED", "SUSPENDED"])("refuses %s accounts", async status => {
    user.accountStatus = status; await expect(service.login(user.phoneNumber, "synthetic-password")).rejects.toThrow();
  });
  it("issues durable own-onboarding access with explicit audience/scope, never operational auth", async () => {
    const result = await service.login(user.phoneNumber, "synthetic-password");
    const token = result as { accessToken: string; refreshToken: string; user: any };
    const payload = jwt.verify(token.accessToken, { audience: PARTNER_ONBOARDING_AUDIENCE });
    expect(payload.scope).toBe("partner-onboarding"); expect(token.user.partnerScope).toBe("onboarding");
    expect(db.partnerMobileSession.create.mock.calls[0][0].data.refreshHash).not.toBe(token.refreshToken);
    expect(auth.login).not.toHaveBeenCalled();
    const normal = new JwtStrategy(config, { findByIdForAuth: async () => ({ ...user, accountStatus: "ACTIVE" }) } as unknown as UsersService);
    await expect(normal.validate(payload)).rejects.toThrow(); // All merchant/admin routes use this JWT strategy.
    expect(() => jwt.verify(token.accessToken, { audience: "unrelated-app" })).toThrow();
    const restricted = new PartnerOnboardingStrategy(config, service);
    await expect(restricted.validate(payload as any)).resolves.toMatchObject({ id: user.id });
    await expect(service.principal("other-owner", payload.sid)).rejects.toThrow();
  });
  it("rotates a refresh token once and rejects replay", async () => {
    const first = await service.login(user.phoneNumber, "synthetic-password") as any;
    const next = await service.refresh(first.refreshToken);
    expect(next.refreshToken).not.toBe(first.refreshToken);
    await expect(service.refresh(first.refreshToken)).rejects.toThrow();
  });
  it("logout revokes restricted sessions and only Partner devices", async () => {
    const result = await service.login(user.phoneNumber, "synthetic-password") as any;
    await service.logout(user.id);
    await expect(service.refresh(result.refreshToken)).rejects.toThrow();
    expect(db.deviceToken.deleteMany).toHaveBeenCalledWith({ where: { userId: user.id, appSurface: "PARTNER_APP" } });
  });
  it("approval requires a fresh normal authorization transition", async () => {
    await service.login(user.phoneNumber, "synthetic-password");
    user.accountStatus = "ACTIVE"; user.vendor = { status: "ACTIVE", deletedAt: null };
    await expect(service.login(user.phoneNumber, "synthetic-password")).resolves.toEqual({ approved: true });
    expect(auth.login).toHaveBeenCalledTimes(1);
  });
  it("password setup needs fresh one-use verified proof, not phoneVerified alone", async () => {
    await expect(service.setPassword(user.phoneNumber, "synthetic-password", "bad-proof")).rejects.toThrow();
    const proof = await service.verifiedPasswordTicket(user.phoneNumber, "synthetic-otp");
    await service.setPassword(user.phoneNumber, "synthetic-password", proof.verificationTicket);
    await expect(service.setPassword(user.phoneNumber, "synthetic-password", proof.verificationTicket)).rejects.toThrow();
    expect(auth.createApplicantPassword).toHaveBeenCalledTimes(1);
  });
});
