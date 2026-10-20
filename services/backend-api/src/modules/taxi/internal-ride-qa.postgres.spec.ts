import "reflect-metadata";
import { BadRequestException, UnauthorizedException, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { PrismaClient } from "@prisma/client";
import { randomBytes, randomUUID } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";
import { AuthService } from "../auth/auth.service";
import { RegisterCustomerDto } from "../auth/dto/register-customer.dto";
import { ResendOtpDto } from "../auth/dto/resend-otp.dto";
import { LoginDto } from "../auth/dto/login.dto";
import { UsersService } from "../users/users.service";
import { NotificationsService } from "../notifications/notifications.service";
import { CaptainWorkStateService } from "../../common/services/captain-work-state.service";
import { InternalRideQaService } from "./internal-ride-qa.service";
import { APPROVED_QA_CAPTAIN, InternalRideQaPolicy, qaPlaceholderPhone } from "./internal-ride-qa.policy";
import { TaxiService } from "./taxi.service";
import { RideCommunicationsService } from "./ride-communications.service";

// Opt in explicitly; never fall back to DATABASE_URL or a Production connection.
const testUrl = process.env.INTERNAL_QA_TEST_DATABASE_URL;
const postgres = testUrl ? describe : describe.skip;
postgres("QA placeholder with real PostgreSQL and the shipped phone CHECK", () => {
  let db: PrismaClient, service: InternalRideQaService, policy: InternalRideQaPolicy;
  let fixture: { tripId: string }, holder: any, constraintBefore: string;
  let ownsEmptyDatabase = false;
  const adminId = randomUUID(), windowId = randomUUID();
  const phone = qaPlaceholderPhone(windowId);
  const config = new ConfigService({ CAPTAIN_RIDE_QA_ENABLED: "true", CAPTAIN_RIDE_QA_WINDOW_ID: windowId, CAPTAIN_RIDE_QA_CAPTAIN_IDS: JSON.stringify([APPROVED_QA_CAPTAIN]) });
  const provider = { send: jest.fn(), issue: jest.fn(async () => ({ expiresAt: new Date(Date.now() + 600_000), provider: "mock" })) };
  const realtime = { emitToUser: jest.fn(), stopWaiting: jest.fn(), emitToRide: jest.fn(), revokeRideAccess: jest.fn() };
  const pipe = new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true });
  const auth = () => new AuthService(new UsersService(db as any), provider as any, db as any, new JwtService(), config, {} as any, {} as any);

  beforeAll(async () => {
    const url = new URL(testUrl!);
    if (url.hostname !== "127.0.0.1" || url.pathname !== "/karigo_qa_placeholder" || url.protocol !== "postgresql:") throw new Error("Only the dedicated loopback QA database is allowed");
    db = new PrismaClient({ datasourceUrl: testUrl!, log: [], errorFormat: "minimal" });
    const identity = await db.$queryRawUnsafe<any[]>("SELECT current_database() AS name, inet_server_addr()::text AS address");
    expect(identity[0]).toMatchObject({ name: "karigo_qa_placeholder", address: "127.0.0.1/32" });
    expect(await db.user.count()).toBe(0);
    ownsEmptyDatabase = true;
    const migration = readFileSync(resolve(process.cwd(), "prisma/migrations/20261015220000_governance_admin_email/migration.sql"), "utf8");
    const checkSql = migration.match(/ALTER TABLE users ADD CONSTRAINT governance_email_phone_required CHECK \([\s\S]*?;/)?.[0];
    expect(checkSql).toBeDefined();
    const existing = await db.$queryRawUnsafe<any[]>("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='users'::regclass AND conname='governance_email_phone_required'");
    if (!existing.length) await db.$executeRawUnsafe(checkSql!);
    constraintBefore = (await db.$queryRawUnsafe<any[]>("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='users'::regclass AND conname='governance_email_phone_required'"))[0].definition;
    await db.user.create({ data: { id: adminId, fullName: "Local QA operator", phoneNumber: "+2348000000001", passwordHash: "!LOCAL_TEST", role: "ADMIN", adminRole: "SUPER_ADMIN", accountStatus: "ACTIVE", phoneVerified: true } });
    await db.user.create({ data: { id: APPROVED_QA_CAPTAIN, fullName: "Local QA Captain", phoneNumber: "+2348000000002", passwordHash: "!LOCAL_TEST", role: "RIDER", accountStatus: "ACTIVE", phoneVerified: true, rider: { create: { riderCode: "LOCAL-QA", phoneNumber: "+2348000000002", availabilityStatus: "OFFLINE" } }, taxiDriverProfiles: { create: { fullName: "Local QA Captain", phoneNumber: "+2348000000002", city: "Abuja", state: "FCT", status: "ACTIVE", isAvailableForTaxi: false } } } });
    policy = new InternalRideQaPolicy(db as any, config);
    service = new InternalRideQaService(db as any, policy, {} as any, {} as any, realtime as any);
  }, 60_000);

  afterAll(async () => {
    // This DB was guarded above and required empty before the test. Never runs against DATABASE_URL.
    if (db) { try { if (ownsEmptyDatabase) await db.$executeRawUnsafe('TRUNCATE TABLE "users" CASCADE'); } finally { await db.$disconnect(); } }
  });

  it.each(["CUSTOMER", "VENDOR", "RIDER", "ADMIN"])("still rejects a NULL phone for ordinary %s", async role => {
    await expect(db.user.create({ data: { fullName: "Local invalid phone", passwordHash: "!LOCAL_TEST", role: role as any, phoneNumber: null } })).rejects.toThrow(/governance_email_phone_required/);
  });

  it("creates the actual fixture against the real constraint without weakening it", async () => {
    fixture = await service.create(adminId);
    const binding = await policy.lookup(fixture.tripId);
    holder = await db.user.findUniqueOrThrow({ where: { id: binding!.customerUserId }, include: { customerProfile: true } });
    expect(holder).toMatchObject({ phoneNumber: phone, role: "CUSTOMER", accountStatus: "DEACTIVATED", phoneVerified: false, email: null });
    expect(holder.passwordHash).toMatch(/^!INTERNAL_QA_NO_LOGIN:/);
    expect(await db.taxiTrip.count()).toBe(1);
    expect(await db.taxiRideSettlement.count()).toBe(0);
    expect(await db.taxiRideFinancialLedgerEntry.count()).toBe(0);
    expect(await db.taxiRideReceipt.count()).toBe(0);
    expect(fixture).not.toHaveProperty("phoneNumber");
    expect(fixture).not.toHaveProperty("customerUserId");
    await expect(service.create(adminId)).rejects.toThrow(/already consumed/);
    expect(await db.user.count({ where: { phoneNumber: phone } })).toBe(1);
  });

  it("rejects synthetic login and OTP requests at the normal validation boundary", async () => {
    for (const metatype of [LoginDto, ResendOtpDto]) {
      await expect(pipe.transform({ phoneNumber: phone, ...(metatype === LoginDto ? { password: randomBytes(16).toString("hex") } : {}) }, { type: "body", metatype })).rejects.toThrow(BadRequestException);
    }
    await expect(auth().login({ phoneNumber: phone, password: randomBytes(16).toString("hex") })).rejects.toThrow(UnauthorizedException);
    expect(await db.refreshToken.count({ where: { userId: holder.id } })).toBe(0);
    expect(await db.otpVerification.count({ where: { userId: holder.id } })).toBe(0);
    expect(provider.issue).not.toHaveBeenCalled();
  });

  it.each(["SMS", "EMAIL", "WHATSAPP", "PUSH", "IN_APP"])("blocks placeholder %s notifications before any provider/history write", async channel => {
    const n = new NotificationsService(db as any, provider as any, provider as any, provider as any, provider as any, provider as any, policy);
    await expect(n.createNotification({ userId: holder.id, title: "Local test", message: "No delivery", type: "SYSTEM_ALERT", channel: channel as any })).rejects.toThrow(UnauthorizedException);
    expect(provider.send).not.toHaveBeenCalled();
    expect(await db.notification.count({ where: { userId: holder.id } })).toBe(0);
  });

  it("never includes the marker in Captain/internal Ride responses or contact options", async () => {
    const taxi: any = Object.create(TaxiService.prototype);
    Object.assign(taxi, { config, logger: { warn: jest.fn() }, rideCommunications: { callReadiness: () => ({ enabled: false }) } });
    const trip = await db.taxiTrip.findUniqueOrThrow({ where: { id: fixture.tripId }, include: taxi.tripInclude() });
    for (const viewer of ["driver", "internal", "admin", "customer"]) {
      const result = taxi.formatTrip(trip, { viewer });
      expect(result.customer.phoneNumber).toBeNull();
      expect(JSON.stringify(result)).not.toContain(phone);
    }
    const communications = new RideCommunicationsService(db as any, config, {} as any, {} as any, realtime as any, policy);
    expect(() => communications.contactOptions(trip as any, "CAPTAIN")).toThrow(/after a Ride Captain is assigned/);
    const contact = communications.contactOptions({ ...trip, status: "ACCEPTED", driverProfileId: (await policy.lookup(fixture.tripId))!.driverProfileId } as any, "CAPTAIN");
    expect(contact.phoneFallbackAvailable).toBe(false);
    expect(contact.phoneNumber).toBeNull();
    expect(await db.order.count({ where: { customerId: holder.customerProfile.id } })).toBe(0);
  });

  it("keeps ordinary Customer registration/phone uniqueness and OTP initiation unchanged", async () => {
    const dto = await pipe.transform({ fullName: "Local ordinary Customer", phoneNumber: "08000000003", password: "LocalExampleOnly9" }, { type: "body", metatype: RegisterCustomerDto });
    const registered = await auth().registerCustomer(dto);
    expect(registered.user).toMatchObject({ role: "CUSTOMER", phoneNumber: "+2348000000003" });
    expect(provider.issue).toHaveBeenCalledWith(registered.user.id, "+2348000000003");
    await expect(db.user.create({ data: { fullName: "Duplicate local Customer", phoneNumber: "+2348000000003", passwordHash: "!LOCAL_TEST", role: "CUSTOMER" } })).rejects.toMatchObject({ code: "P2002" });
    await expect(pipe.transform({ fullName: "Local invalid Customer", phoneNumber: phone, password: "LocalExampleOnly9" }, { type: "body", metatype: RegisterCustomerDto })).rejects.toThrow(BadRequestException);
    expect(await db.taxiTrip.count({ where: { customerId: registered.user.customerProfile!.id } })).toBe(0);
  });

  it("refuses changed placeholder identity and rolls cleanup back", async () => {
    await db.user.update({ where: { id: holder.id }, data: { phoneNumber: "+2348000000004" } });
    await expect(service.cleanup(adminId, fixture.tripId)).rejects.toThrow(/changed/);
    expect(await db.taxiTrip.findUnique({ where: { id: fixture.tripId } })).not.toBeNull();
    expect(await db.user.findUnique({ where: { id: holder.id } })).not.toBeNull();
    await db.user.update({ where: { id: holder.id }, data: { phoneNumber: phone } });
  });

  it("removes disposable placeholder/profile/fixture and preserves the phone constraint", async () => {
    const result = await service.cleanup(adminId, fixture.tripId);
    expect(result.cleaned).toBe(true);
    expect(Object.values(result.residuals).every(x => x === 0)).toBe(true);
    expect(await db.user.findUnique({ where: { id: holder.id } })).toBeNull();
    expect(await db.customerProfile.findUnique({ where: { id: holder.customerProfile.id } })).toBeNull();
    expect(await db.user.findUnique({ where: { id: APPROVED_QA_CAPTAIN } })).not.toBeNull();
    const constraintAfter = (await db.$queryRawUnsafe<any[]>("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='users'::regclass AND conname='governance_email_phone_required'"))[0].definition;
    expect(constraintAfter).toBe(constraintBefore);
  });
  it.each([false, true])("keeps a real DB REQUESTED fixture invisible until atomic offer and cleans either stage (offered=%s)", async offered => {
    config.set("CAPTAIN_RIDE_QA_WINDOW_ID", randomUUID());
    const work = new CaptainWorkStateService(db as any, {} as any, {} as any, policy);
    const notifications = { createNotification: jest.fn(async () => ({ accepted: true })) };
    const qa = new InternalRideQaService(db as any, policy, work, notifications as any, realtime as any);
    const created = await qa.create(adminId);
    const binding = (await policy.lookup(created.tripId))!;
    const before = await db.taxiTrip.findUniqueOrThrow({ where: { id: created.tripId } });
    expect(before).toMatchObject({ status: "REQUESTED", driverProfileId: null });
    expect(await db.taxiTrip.count({ where: { driverProfileId: binding.driverProfileId } })).toBe(0);
    expect(await policy.armedCaptain(APPROVED_QA_CAPTAIN)).toBe(true);
    expect((await db.taxiDriverProfile.findUniqueOrThrow({ where: { id: binding.driverProfileId } })).isAvailableForTaxi).toBe(false);
    expect((await db.captainWorkState.findUnique({ where: { userId: APPROVED_QA_CAPTAIN } }))?.activeWorkMode ?? null).toBeNull();
    await expect(qa.offer(adminId, created.tripId)).rejects.toThrow();
    expect(await db.taxiTrip.findUniqueOrThrow({ where: { id: created.tripId } })).toMatchObject({ status: "REQUESTED", driverProfileId: null });
    if (offered) {
      await db.captainWorkState.upsert({ where: { userId: APPROVED_QA_CAPTAIN }, create: { userId: APPROVED_QA_CAPTAIN, desiredRideOnline: true }, update: { desiredRideOnline: true } });
      const attempts = await Promise.allSettled([qa.offer(adminId, created.tripId), qa.offer(adminId, created.tripId)]);
      expect(attempts.filter(x => x.status === "fulfilled")).toHaveLength(1);
      expect(attempts.filter(x => x.status === "rejected")).toHaveLength(1);
      expect(await db.taxiTrip.findUniqueOrThrow({ where: { id: created.tripId } })).toMatchObject({ status: "DRIVER_ASSIGNED", driverProfileId: binding.driverProfileId });
      expect(await db.captainWorkState.findUniqueOrThrow({ where: { userId: APPROVED_QA_CAPTAIN } })).toMatchObject({ activeWorkMode: "RIDE", activeRideTripId: created.tripId, lockStage: "OFFERED" });
      expect(notifications.createNotification).toHaveBeenCalledTimes(2);
      await expect(qa.offer(adminId, created.tripId)).rejects.toThrow(/already attempted/);
    }
    const cleaned = await qa.cleanup(adminId, created.tripId);
    expect(Object.values(cleaned.residuals).every(x => x === 0)).toBe(true);
    const finalState = await db.captainWorkState.findUnique({ where: { userId: APPROVED_QA_CAPTAIN } });
    if (finalState) expect(finalState).toMatchObject({ desiredRideOnline: false, activeWorkMode: null, activeRideTripId: null, lockStage: null });
  });

});
