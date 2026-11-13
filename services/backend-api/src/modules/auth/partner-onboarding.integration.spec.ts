import { PublicVendorApplicationsController } from "../vendor-applications/vendor-applications.controller";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PassportModule } from "@nestjs/passport";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { hash } from "bcrypt";
import supertest from "supertest";
import { PartnerSessionService, PartnerOnboardingGuard, PartnerOnboardingStrategy } from "./partner-session";
import { JwtStrategy } from "./jwt.strategy";
import { UsersService } from "../users/users.service";
import { RolesGuard } from "../../common/guards/roles.guard";
import { PartnerAuthController } from "./partner-auth.controller";
import { VendorDashboardOrdersController } from "../vendor-dashboard-orders/vendor-dashboard-orders.controller";
import { VendorDashboardOrdersService } from "../vendor-dashboard-orders/vendor-dashboard-orders.service";
import { VendorApplicationsService } from "../vendor-applications/vendor-applications.service";
import { PartnerMobileOnboardingController } from "../vendor-applications/partner-mobile.controller";
import { PartnerMobileFilesService } from "../vendor-applications/partner-mobile-files.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AuthService } from "./auth.service";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { VendorPrivateUploadStorageService } from "../vendors/vendor-private-upload-storage.service";

const url = process.env.KARIGO_PARTNER_P1_TEST_DATABASE_URL;
if (url) { const parsed = new URL(url); if (parsed.hostname !== "127.0.0.1" || parsed.port !== "55443" || parsed.pathname !== "/karigo_partner_p1_20261112") throw new Error("Dedicated synthetic loopback Partner database required."); }
const suite = url ? describe : describe.skip;
jest.setTimeout(60_000);
suite("Partner onboarding handoff — real JWT, HTTP guards and PostgreSQL", () => {
  const db = new PrismaClient({ datasourceUrl: url });
  const jwt = new JwtService({ secret: "synthetic-partner-http-secret" });
  const config = { getOrThrow: () => "synthetic-partner-http-secret" } as unknown as ConfigService;
  const storage = { storageLocation: () => ({ provider: "LOCAL", bucket: "synthetic-private" }), putOnboardingDocument: async () => `synthetic/${randomUUID()}`, readOwnedObject: async () => Buffer.from("%PDF-test"), deleteOwnedObject: jest.fn() };
  const files = new PartnerMobileFilesService(db as PrismaService, storage as unknown as VendorPrivateUploadStorageService);
  const applications = new VendorApplicationsService(db as PrismaService, {} as ApplicationNotificationsService, undefined, undefined, files);
  const orders = { list: jest.fn(async () => []) };
  const auth = { me: async (id: string) => db.user.findUnique({ where: { id } }), logout: jest.fn(), login: jest.fn(async () => ({ approved: true })) };
  const sessions = new PartnerSessionService(db as PrismaService, jwt, auth as unknown as AuthService);
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [PassportModule.register({ defaultStrategy: "jwt" })],
      controllers: [PublicVendorApplicationsController, PartnerAuthController, PartnerMobileOnboardingController, VendorDashboardOrdersController], providers: [
        PartnerOnboardingGuard, PartnerOnboardingStrategy, JwtStrategy, RolesGuard,
        { provide: PrismaService, useValue: db }, { provide: ConfigService, useValue: config }, { provide: PartnerSessionService, useValue: sessions }, { provide: AuthService, useValue: auth },
        { provide: UsersService, useValue: { findByIdForAuth: (id: string) => db.user.findUnique({ where: { id } }) } },
        { provide: VendorApplicationsService, useValue: applications }, { provide: PartnerMobileFilesService, useValue: files },
        { provide: VendorDashboardOrdersService, useValue: orders }
      ] }).compile();
    app = module.createNestApplication(); app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true })); await app.init();
  });
  afterAll(async () => { await app.close(); await db.$disconnect(); });
  async function applicant(verified = true) {
    return db.user.create({ data: { fullName: "Synthetic HTTP applicant", phoneNumber: `+2348${Date.now().toString().slice(-9)}`, passwordHash: await hash("synthetic-password", 4),
      role: "VENDOR", phoneVerified: verified, accountStatus: "PENDING" } });
  }
  async function login(phoneNumber: string) {
    return (await supertest(app.getHttpServer()).post("/partner-mobile/session").send({ phoneNumber, password: "synthetic-password" }).expect(201)).body.data;
  }
  it("unverified applicants cannot obtain a session", async () => {
    const user = await applicant(false);
    await supertest(app.getHttpServer()).post("/partner-mobile/session").send({ phoneNumber: user.phoneNumber, password: "synthetic-password" }).expect(401);
    expect(await db.partnerMobileSession.count({ where: { userId: user.id } })).toBe(0);
  });
  it("pending verified applicant can save only own credential-free draft and cannot invoke orders", async () => {
    const user = await applicant(); const session = await login(user.phoneNumber!);
    await supertest(app.getHttpServer()).post("/partner-mobile/onboarding/ensure").set("Authorization", `Bearer ${session.accessToken}`).expect(201);
    await supertest(app.getHttpServer()).patch("/partner-mobile/onboarding/draft").set("Authorization", `Bearer ${session.accessToken}`).send({ draftData: { businessName: "Safe synthetic business", password: "forbidden" } }).expect(400);
    await supertest(app.getHttpServer()).patch("/partner-mobile/onboarding/draft").set("Authorization", `Bearer ${session.accessToken}`).send({ draftData: { businessName: "Safe synthetic business" } }).expect(200);
    expect((await db.partnerOnboardingDraft.findUniqueOrThrow({ where: { userId: user.id } })).draftData).toEqual({ businessName: "Safe synthetic business" });
    await supertest(app.getHttpServer()).patch("/partner-mobile/onboarding/draft").set("Authorization", `Bearer ${session.accessToken}`).send({ userId: randomUUID(), draftData: {} }).expect(400);
    await supertest(app.getHttpServer()).get("/vendor-dashboard/orders").set("Authorization", `Bearer ${session.accessToken}`).expect(401);
    expect(orders.list).not.toHaveBeenCalled();
  });
  it("legacy public application endpoints cannot bypass authenticated ownership", async () => {
    await supertest(app.getHttpServer()).post("/vendor-applications").send({}).expect(401);
    await supertest(app.getHttpServer()).get("/vendor-applications/status?phoneNumber=08000000000").expect(401);
  });
  it("private upload bytes are readable only by their signed-in owner", async () => {
    const owner = await applicant(); const a = await login(owner.phoneNumber!);
    const other = await applicant(); const b = await login(other.phoneNumber!);
    const result = await supertest(app.getHttpServer()).post("/partner-mobile/onboarding/files").set("Authorization", `Bearer ${a.accessToken}`)
      .attach("file", Buffer.from("%PDF-test"), { filename: "../../unsafe.pdf", contentType: "application/pdf" }).expect(201);
    const uri = result.body.data.url;
    await supertest(app.getHttpServer()).get(uri).set("Authorization", `Bearer ${b.accessToken}`).expect(404);
    await supertest(app.getHttpServer()).get(uri).expect(401);
    const own = await supertest(app.getHttpServer()).get(uri).set("Authorization", `Bearer ${a.accessToken}`).expect(200);
    expect(own.headers["cache-control"]).toBe("private, no-store");
  });
  it("wrong audience is rejected, and approval does not elevate an old restricted token", async () => {
    const user = await applicant(); const session = await login(user.phoneNumber!);
    const payload = jwt.verify(session.accessToken);
    const wrong = jwt.sign({ sub: payload.sub, sid: payload.sid, scope: payload.scope }, { audience: "wrong-app" });
    await supertest(app.getHttpServer()).get("/partner-mobile/me").set("Authorization", `Bearer ${wrong}`).expect(401);
    await db.user.update({ where: { id: user.id }, data: { accountStatus: "ACTIVE" } });
    await supertest(app.getHttpServer()).get("/vendor-dashboard/orders").set("Authorization", `Bearer ${session.accessToken}`).expect(401);
  });
  it("refresh rotates, replay fails, and logout revokes the current HTTP session", async () => {
    const user = await applicant(); const first = await login(user.phoneNumber!);
    const second = (await supertest(app.getHttpServer()).post("/partner-mobile/session/refresh").send({ refreshToken: first.refreshToken }).expect(201)).body.data;
    await supertest(app.getHttpServer()).post("/partner-mobile/session/refresh").send({ refreshToken: first.refreshToken }).expect(401);
    await supertest(app.getHttpServer()).post("/partner-mobile/session/logout").set("Authorization", `Bearer ${second.accessToken}`).send({ refreshToken: second.refreshToken }).expect(201);
    await supertest(app.getHttpServer()).get("/partner-mobile/me").set("Authorization", `Bearer ${second.accessToken}`).expect(401);
  });
});
