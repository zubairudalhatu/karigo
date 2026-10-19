import "reflect-metadata";
import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { JwtService } from "@nestjs/jwt";
import { AccountStatus, UserRole } from "@prisma/client";
import { hash } from "bcrypt";
import request from "supertest";
import { randomUUID } from "crypto";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";
import { PhoneChangeService } from "./phone-change.service";
import { UsersService } from "../users/users.service";
import { CaptainAccessController, DeliveryCaptainApplicationsController } from "../riders/riders.controller";
import { RidersService } from "../riders/riders.service";
import { TaxiController } from "../taxi/taxi.controller";
import { RiderTaxiController } from "../taxi/rider-taxi.controller";
import { TaxiService } from "../taxi/taxi.service";
import { RideFinanceService } from "../taxi/ride-finance.service";
import { RideCommissionPaymentService } from "../payments/ride-commission-payment.service";
import { CaptainWorkStateService } from "../../common/services/captain-work-state.service";
import { NotificationsController } from "../notifications/notifications.controller";
import { NotificationsService } from "../notifications/notifications.service";
import { DeviceTokensService } from "../notifications/device-tokens.service";
import { RideRealtimeGateway } from "../taxi/ride-realtime.gateway";
import { RiderDispatchController } from "../dispatch/rider-dispatch.controller";
import { DispatchService } from "../dispatch/dispatch.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("Captain onboarding sessions — local HTTP boundary", () => {
  let app: INestApplication;
  let user: any;
  let passwordHash: string;
  let records: any[];
  const password = "LocalOnlyFixturePassword42";
  const jwt = new JwtService({ secret: "local-captain-session-fixture-not-production", signOptions: { expiresIn: "1h" } });
  const refresh = new Map<string, any>();
  const db: any = {
    user: { findUnique: jest.fn(async () => user), update: jest.fn(async () => user) },
    userLoginActivity: { create: jest.fn() },
    rider: { findUnique: jest.fn(async () => null) },
    taxiDriverProfile: { findUnique: jest.fn(async () => null) },
    deliveryCaptainApplication: { findFirst: jest.fn(async () => null) },
    taxiDriverApplication: { findFirst: jest.fn(async () => null) },
    refreshToken: {
      create: jest.fn(async ({ data }: any) => { const row = { ...data, id: randomUUID(), user }; refresh.set(data.tokenHash, row); return row; }),
      findUnique: jest.fn(async ({ where }: any) => { const row = refresh.get(where.tokenHash); return row ? { ...row, user } : null; }),
      update: jest.fn(async ({ where, data }: any) => { for (const row of refresh.values()) if (row.id === where.id) Object.assign(row, data); }),
      updateMany: jest.fn(async () => ({}))
    },
    captainApplicationDocument: {
      updateMany: jest.fn(),
      create: jest.fn(async ({ data }: any) => { const row = { ...data, id: randomUUID(), uploadedAt: new Date(), deletedAt: null }; records.push(row); return row; }),
      findMany: jest.fn(async ({ where }: any) => records.filter(r => r.userId === where.userId))
    },
    $transaction: async (callback: any) => callback(db)
  };
  const users = new UsersService(db);
  const otp: any = { issue: jest.fn(async () => ({ expiresAt: new Date() })), verify: jest.fn() };
  const auth = new AuthService(users, otp, db, jwt, { get: (_: string, fallback: any) => fallback } as any, {} as any, {} as any);
  const storage: any = { putObject: jest.fn(), storageLocation: () => ({ provider: "S3", bucket: "local-fixture" }) };
  const riders = new RidersService(db, storage, {} as any, {} as any);
  const work: any = { getForUser: jest.fn(), updateAvailability: jest.fn() };
  const taxi: any = { riderTaxiProfile: jest.fn(), riderSetAvailability: jest.fn(), submitDriverApplication: jest.fn(), currentUserApplicationStatus: jest.fn() };
  const finance: any = { captainStatement: jest.fn() };
  const devices: any = { register: jest.fn() };

  beforeAll(async () => {
    passwordHash = await hash(password, 4);
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: "jwt" })],
      controllers: [AuthController, CaptainAccessController, TaxiController, RiderTaxiController, RiderDispatchController, DeliveryCaptainApplicationsController, NotificationsController],
      providers: [
        { provide: AuthService, useValue: auth }, { provide: PhoneChangeService, useValue: {} },
        { provide: JwtStrategy, useFactory: () => new JwtStrategy({ getOrThrow: () => "local-captain-session-fixture-not-production" } as any, users) },
        { provide: RidersService, useValue: riders }, { provide: CaptainWorkStateService, useValue: work },
        { provide: TaxiService, useValue: taxi }, { provide: RideFinanceService, useValue: finance },
        { provide: RideCommissionPaymentService, useValue: {} },
        { provide: NotificationsService, useValue: {} }, { provide: DeviceTokensService, useValue: devices },
        { provide: DispatchService, useValue: {} }, { provide: PrismaService, useValue: db }
      ]
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });
  afterAll(async () => app?.close());
  beforeEach(() => {
    jest.clearAllMocks(); refresh.clear(); records = [];
    user = { id: randomUUID(), fullName: "Synthetic Applicant", phoneNumber: "+2348000000000", email: null,
      role: UserRole.RIDER, adminRole: null, accountStatus: AccountStatus.PENDING, deletedAt: null,
      phoneVerified: true, onboardingPasswordSetAt: new Date(), passwordHash,
      accountDeletionRequests: [], deliveryCaptainApplications: [], taxiDriverApplications: [], rider: null, taxiDriverProfiles: [] };
  });
  const login = () => request(app.getHttpServer()).post("/auth/login").send({ phoneNumber: user.phoneNumber, password });
  const token = async () => (await login()).body.data.accessToken as string;

  it("issues a 15-minute scoped JWT for the actual verified pending subject, without activating it", async () => {
    const result = await login(); expect(result.status).toBe(201);
    const claims: any = jwt.verify(result.body.data.accessToken);
    expect(claims).toMatchObject({ sub: user.id, role: "RIDER", scope: "captain-onboarding" });
    expect(claims.exp - claims.iat).toBe(900);
    expect(result.body.data.refreshToken).toMatch(/^co1\./);
    expect(user.accountStatus).toBe("PENDING");
    expect((await request(app.getHttpServer()).get("/auth/me").auth(result.body.data.accessToken, { type: "bearer" })).status).toBe(200);
  });
  it("does not issue a session to an unverified Captain", async () => {
    user.phoneVerified = false;
    const result = await login(); expect(result.body.data.accessToken).toBeUndefined();
    expect(db.refreshToken.create).not.toHaveBeenCalled();
  });
  it("does not activate a pending Captain through the general Customer OTP route", async () => {
    user.phoneVerified = false;
    await expect(auth.verifyOtp({ phoneNumber: user.phoneNumber, otp: "123456" })).rejects.toThrow("Captain onboarding");
    expect(db.user.update).not.toHaveBeenCalled();
  });
  it("uploads and reads only owned document status without exposing object keys or internal notes", async () => {
    const bearer = await token();
    const result = await request(app.getHttpServer()).post("/captain/application-documents/uploads").auth(bearer, { type: "bearer" })
      .field("documentType", "DRIVER_LICENCE").attach("file", Buffer.from("synthetic local document"), { filename: "synthetic.pdf", contentType: "application/pdf" });
    expect(result.status).toBe(201); expect(storage.putObject).toHaveBeenCalledTimes(1);
    expect(records[0].userId).toBe(user.id);
    records.push({ ...records[0], userId: randomUUID(), id: randomUUID(), adminNote: "private" });
    const read = await request(app.getHttpServer()).get("/captain/application-documents").auth(bearer, { type: "bearer" });
    expect(read.status).toBe(200); expect(read.body.data).toHaveLength(1);
    expect(JSON.stringify(read.body)).not.toMatch(/objectKey|adminNote|storageBucket|passwordHash/);
  });
  it("uses the JWT subject for the authenticated application, not caller identity", async () => {
    const bearer = await token();
    const result = await request(app.getHttpServer()).get("/taxi/driver-applications/me").auth(bearer, { type: "bearer" });
    expect(result.status).toBe(200); expect(taxi.currentUserApplicationStatus).toHaveBeenCalledWith(user.id);
  });
  it("restores the pending onboarding route without exposing operational access", async () => {
    const bearer = await token();
    const result = await request(app.getHttpServer()).get("/captain/access").auth(bearer, { type: "bearer" });
    expect(result.status).toBe(200);
    expect(result.body.data).toMatchObject({ nextRoute: "/auth/apply", operationalModes: [], account: { id: user.id, accountStatus: "PENDING" } });
  });
  it.each([
    ["patch", "/captain/availability"], ["get", "/captain/work-state"],
    ["patch", "/rider/taxi/availability"], ["get", "/rider/taxi/profile"],
    ["get", "/rider/taxi/earnings/statement"], ["post", "/rider/taxi/commission-payments"],
    ["post", "/notifications/device-tokens"], ["get", "/notifications"],
    ["get", "/rider/taxi/trips/available"], ["post", "/rider/taxi/trips/00000000-0000-4000-8000-000000000001/accept"],
    ["get", "/rider/jobs"], ["post", "/rider/jobs/00000000-0000-4000-8000-000000000001/accept"],
    ["patch", "/rider/location"], ["patch", "/rider/availability"], ["get", "/rider/earnings"]
  ])("denies operational endpoint %s %s before its handler", async (method, path) => {
    const bearer = await token();
    const response = await (request(app.getHttpServer()) as any)[method](path).auth(bearer, { type: "bearer" }).send({});
    expect(response.status).toBe(403);
    expect(work.getForUser).not.toHaveBeenCalled(); expect(work.updateAvailability).not.toHaveBeenCalled();
    expect(finance.captainStatement).not.toHaveBeenCalled(); expect(devices.register).not.toHaveBeenCalled();
  });
  it("rejects operational realtime even after the database account becomes ACTIVE", async () => {
    const bearer = await token(); user.accountStatus = AccountStatus.ACTIVE;
    const realtime: any = { userRoom: jest.fn() };
    const gateway = new RideRealtimeGateway(jwt, db, {} as any, realtime);
    const client: any = { handshake: { auth: { token: bearer } }, data: {}, join: jest.fn(), emit: jest.fn(), disconnect: jest.fn() };
    await gateway.handleConnection(client);
    expect(client.disconnect).toHaveBeenCalledWith(true); expect(client.join).not.toHaveBeenCalled();
  });
  it("rotates restricted refresh and upgrades only after approval activates the user", async () => {
    const first = (await login()).body.data;
    const second = await auth.refreshSession({ refreshToken: first.refreshToken });
    expect((jwt.verify(second.accessToken) as any).scope).toBe("captain-onboarding");
    await expect(auth.refreshSession({ refreshToken: first.refreshToken })).rejects.toThrow();
    user.accountStatus = AccountStatus.ACTIVE;
    const old = await request(app.getHttpServer()).get("/rider/taxi/profile").auth(second.accessToken, { type: "bearer" });
    expect(old.status).toBe(403);
    const normal = await auth.refreshSession({ refreshToken: second.refreshToken });
    expect(jwt.verify(normal.accessToken)).not.toHaveProperty("scope");
    expect((await request(app.getHttpServer()).get("/rider/taxi/profile").auth(normal.accessToken, { type: "bearer" })).status).toBe(200);
  });
  it("rejects an old unscoped JWT while pending and does not trust a caller role or scope", async () => {
    const old = jwt.sign({ sub: user.id, role: "ADMIN" });
    expect((await request(app.getHttpServer()).get("/auth/me").auth(old, { type: "bearer" })).status).toBe(401);
    const forged = await request(app.getHttpServer()).post("/auth/login").send({ phoneNumber: user.phoneNumber, password, role: "ADMIN", scope: "normal" });
    expect(forged.status).toBe(400); expect(db.refreshToken.create).not.toHaveBeenCalled();
  });
  it("does not let a modified refresh prefix escape restriction", async () => {
    const first = (await login()).body.data;
    await expect(auth.refreshSession({ refreshToken: first.refreshToken.slice(4) })).rejects.toThrow();
  });
  it("does not let setup endpoints reactivate a disabled Captain or overwrite an established password", async () => {
    await expect(auth.createApplicantPassword(UserRole.RIDER, { phoneNumber: user.phoneNumber, password })).rejects.toThrow();
    user.accountStatus = AccountStatus.SUSPENDED; user.phoneVerified = false; user.onboardingPasswordSetAt = null;
    await expect(auth.verifyApplicantOtp(UserRole.RIDER, { phoneNumber: user.phoneNumber, otp: "123456" })).rejects.toThrow();
    await expect(auth.createApplicantPassword(UserRole.RIDER, { phoneNumber: user.phoneNumber, password })).rejects.toThrow();
    await expect(auth.verifyOtp({ phoneNumber: user.phoneNumber, otp: "123456" })).rejects.toThrow();
    expect(db.user.update).not.toHaveBeenCalled(); expect(otp.verify).not.toHaveBeenCalled();
  });
  it.each(["rejected", "suspended", "deleted", "captain-deletion", "profile-disabled"])("revokes onboarding access when %s", async reason => {
    const session = (await login()).body.data;
    if (reason === "rejected") user.taxiDriverApplications = [{ status: "REJECTED", trashedAt: null }];
    if (reason === "suspended") user.accountStatus = AccountStatus.SUSPENDED;
    if (reason === "deleted") user.deletedAt = new Date();
    if (reason === "captain-deletion") user.accountDeletionRequests = [{ id: randomUUID() }];
    if (reason === "profile-disabled") user.taxiDriverProfiles = [{ status: "DEACTIVATED" }];
    expect((await request(app.getHttpServer()).get("/auth/me").auth(session.accessToken, { type: "bearer" })).status).toBe(401);
    await expect(auth.refreshSession({ refreshToken: session.refreshToken })).rejects.toThrow();
    expect((await login()).body.data?.accessToken).toBeUndefined();
  });
  it.each([UserRole.CUSTOMER, UserRole.VENDOR, UserRole.ADMIN])("preserves active %s authentication without onboarding scope", async role => {
    user.role = role; user.accountStatus = AccountStatus.ACTIVE;
    const result = await login(); expect(result.status).toBe(201);
    expect(jwt.verify(result.body.data.accessToken)).not.toHaveProperty("scope");
    expect((await request(app.getHttpServer()).get("/auth/me").auth(result.body.data.accessToken, { type: "bearer" })).status).toBe(200);
  });
});
