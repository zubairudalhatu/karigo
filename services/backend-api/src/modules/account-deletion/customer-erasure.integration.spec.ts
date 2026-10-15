import { ConflictException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { hash } from "bcrypt";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CustomerErasureService } from "./customer-erasure.service";
import { CustomerDeletionReceiptController } from "./customer-deletion-receipt.controller";
import { RequestAccountDeletionDto } from "./dto/request-account-deletion.dto";
import { JwtStrategy } from "../auth/jwt.strategy";
import { UsersService } from "../users/users.service";
import { CustomersService } from "../customers/customers.service";
import { DeviceTokensService } from "../notifications/device-tokens.service";
import { PrismaService } from "../../prisma/prisma.service";
import { Test } from "@nestjs/testing";
import { PassportModule } from "@nestjs/passport";
import { ValidationPipe, INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import supertest from "supertest";
import { AccountDeletionController } from "./account-deletion.controller";
import { AccountDeletionService } from "./account-deletion.service";
import { DataRetentionService } from "./data-retention.service";
import { RolesGuard } from "../../common/guards/roles.guard";
import { DAY_MS } from "./retention-policy";

// Real PostgreSQL cleanup spans many tables; allow bounded local I/O under
// the full suite rather than the 5-second unit-test default.
jest.setTimeout(30_000);

const url = process.env.KARIGO_DELETION_TEST_DATABASE_URL;
const parsed = url ? new URL(url) : null;
if (parsed && (parsed.hostname !== "127.0.0.1" || parsed.port !== "55439" || !["/karigo_deletion_qa_20261015_v4", "/karigo_retention_qa_20261015"].includes(parsed.pathname))) {
  throw new Error("Refusing deletion fixtures outside the dedicated loopback database.");
}
const suite = url ? describe : describe.skip;
suite("Customer erasure — real isolated PostgreSQL", () => {
  const db = new PrismaClient({ datasourceUrl: url });
  const prisma = db as unknown as PrismaService;
  const notice = { send: jest.fn(), assertConfigured: jest.fn(), verifyExisting: jest.fn() };
  const service = new CustomerErasureService(prisma, notice as never);
  const receiptController = new CustomerDeletionReceiptController(service);
  const approval = { status: "COMPLETED" as const, confirmCustomerErasure: "DELETE_CUSTOMER_DATA",
    noIdentifiableLegalHoldConfirmed: true,
    retentionApproval: "SYNTHETIC-POLICY-ONLY", externalCleanupEvidence: "SYNTHETIC-EXTERNAL-CLEANUP-ONLY" };
  let adminId: string;
  let app: INestApplication;
  const jwt = new JwtService({ secret: "synthetic-deletion-test-signing-key" });
  let f: Awaited<ReturnType<typeof fixture>>;
  async function fixture() {
    const tag = randomUUID();
    const user = await db.user.create({ data: { fullName: "Synthetic Deletion Customer", phoneNumber: `fixture:${tag}`,
      email: `${tag}@example.invalid`, passwordHash: await hash("SyntheticPassword1", 4), profilePhotoUrl: "data:image/png;base64,Zml4dHVyZQ==",
      role: "CUSTOMER", accountStatus: "ACTIVE", phoneVerified: true,
      customerProfile: { create: { referralCode: tag, requireRidePin: true, referralProfile: { create: { code: tag } } } } }, include: { customerProfile: true } });
    const customerId = user.customerProfile!.id;
    const address = await db.address.create({ data: { userId: user.id, label: "Home", addressLine: "Synthetic private address",
      city: "Abuja", state: "FCT", latitude: 9.07, longitude: 7.39 } });
    const wallet = await db.customerWallet.create({ data: { customerId } });
    const credit = await db.customerWalletLedgerEntry.create({ data: { walletId: wallet.id, customerId, entryType: "TOP_UP", direction: "CREDIT",
      amount: 1000, balanceBefore: 0, balanceAfter: 1000, reference: `credit:${tag}`, description: user.email,
      metadata: { email: user.email, name: user.fullName } } });
    const debit = await db.customerWalletLedgerEntry.create({ data: { walletId: wallet.id, customerId, entryType: "SERVICE_PAYMENT", direction: "DEBIT",
      amount: 1000, balanceBefore: 1000, balanceAfter: 0, reference: `debit:${tag}`, description: user.phoneNumber, metadata: { meter: "synthetic-private-meter" } } });
    const order = await db.order.create({ data: { customerId, serviceCategory: "PARCEL", orderNumber: `order:${tag}`, orderStatus: "COMPLETED", paymentStatus: "SUCCESSFUL",
      deliveryAddressId: address.id, recipientName: user.fullName, recipientPhone: user.phoneNumber, customerNote: user.email,
      deliveryOtp: "fixture-otp", totalAmount: 1000, items: { create: { productName: user.fullName, unitPrice: 1000, quantity: 1, totalPrice: 1000, specialInstruction: user.email } } } });
    const payment = await db.payment.create({ data: { customerId, gateway: "SYNTHETIC", transactionReference: `payment:${tag}`,
      amount: 1000, paymentPurpose: "WALLET_TOP_UP", walletLedgerEntryId: credit.id, paymentStatus: "SUCCESSFUL", gatewayResponse: { email: user.email } } });
    await db.paymentWebhookLog.create({ data: { gateway: "SYNTHETIC", eventType: "fixture", transactionReference: payment.transactionReference, payload: { phone: user.phoneNumber } } });
    const provider = await db.utilityProvider.create({ data: { type: "ELECTRICITY", name: "Synthetic", code: `fixture:${tag}` } });
    const utility = await db.utilityTransaction.create({ data: { customerId, providerId: provider.id, reference: `utility:${tag}`, serviceType: "ELECTRICITY",
      amountKobo: 100000, totalKobo: 100000, recipient: "synthetic-private-meter", recipientName: user.fullName, mockToken: "synthetic-token",
      status: "SUCCESSFUL", providerStatus: "SUCCESSFUL", providerReference: `provider:${tag}`, metadata: { token: "synthetic-token", walletDebitReference: debit.reference, walletDebitStatus: "POSTED", email: user.email } } });
    const ticket = await db.supportTicket.create({ data: { customerId, ticketNumber: `ticket:${tag}`, category: "PAYMENT_ISSUE", subject: user.email!,
      description: user.fullName, status: "CLOSED", messages: { create: { senderUserId: user.id, senderRole: "CUSTOMER", message: user.phoneNumber } } } });
    await db.deviceToken.create({ data: { userId: user.id, token: `ExponentPushToken[fixture-${tag}]`, platform: "IOS", provider: "EXPO", appSurface: "CUSTOMER_APP" } });
    await db.refreshToken.create({ data: { userId: user.id, tokenHash: tag, expiresAt: new Date(Date.now() + 86_400_000) } });
    await db.biometricCredential.create({ data: { userId: user.id, credentialIdHash: tag, appSurface: "CUSTOMER_APP", platform: "IOS" } });
    await db.otpVerification.create({ data: { userId: user.id, codeHash: tag, expiresAt: new Date(Date.now() + 60_000) } });
    await db.notification.create({ data: { userId: user.id, title: user.fullName, message: user.email!, type: "SYSTEM_ALERT" } });
    await db.accountSecurityEvent.create({ data: { userId: user.id, action: "fixture", metadata: { phone: user.phoneNumber } } });
    const trip = await db.taxiTrip.create({ data: { customerId, tripReference: `trip:${tag}`, pickupAddress: address.addressLine, destinationAddress: user.email!,
      pickupLatitude: 9, pickupLongitude: 7, destinationLatitude: 9, destinationLongitude: 7, estimatedFareKobo: 100000, status: "COMPLETED",
      events: { create: { actorType: "CUSTOMER", actorId: user.id, eventType: "RIDE_MESSAGE", note: user.email, metadata: { body: user.fullName } } },
      tracePoints: { create: { clientPointId: tag, latitude: 9, longitude: 7, recordedAt: new Date() } } } });
    const receipt = await db.taxiRideReceipt.create({ data: { tripId: trip.id, receiptNumber: `receipt:${tag}`, pickupAddress: address.addressLine,
      destinationAddress: user.email!, rideCategory: "STANDARD", rideFareKobo: 100000, totalFareKobo: 100000, completedAt: new Date() } });
    await db.taxiRideReceiptEmailDelivery.create({ data: { tripId: trip.id, receiptId: receipt.id, dedupeKey: tag, recipientEmail: user.email, status: "SENT" } });
    await db.adminAuditLog.create({ data: { adminUserId: adminId, action: "fixture", entityType: "User", entityId: user.id,
      newValue: { email: user.email }, ipAddress: "127.0.0.1" } });
    return { user, customerId, wallet, order, payment, utility, ticket, trip, credit, debit, receiptToken: service.prepareReceipt().receiptToken };
  }
  async function request() {
    return service.request(f.user.id, { accountType: "CUSTOMER", confirmation: "DELETE", receiptToken: f.receiptToken });
  }
  async function complete() {
    const requested = await request();
    await service.review(adminId, requested.id, approval);
    return requested;
  }
  beforeAll(async () => {
    adminId = (await db.user.create({ data: { fullName: "Synthetic Admin", phoneNumber: `fixture-admin:${randomUUID()}`,
      passwordHash: "fixture", role: "ADMIN", adminRole: "SUPER_ADMIN", accountStatus: "ACTIVE" } })).id;
    const module = await Test.createTestingModule({ imports: [PassportModule], controllers: [AccountDeletionController, CustomerDeletionReceiptController],
      providers: [
        { provide: CustomerErasureService, useValue: service },
        { provide: AccountDeletionService, useValue: { request: (id: string, dto: RequestAccountDeletionDto) => service.request(id, dto) } },
        { provide: JwtStrategy, useFactory: () => new JwtStrategy({ getOrThrow: () => "synthetic-deletion-test-signing-key" } as never, new UsersService(prisma)) }
      ] }).compile();
    app = module.createNestApplication(); app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true })); await app.init();
  });
  beforeEach(async () => {
    jest.restoreAllMocks(); notice.send.mockReset().mockResolvedValue(randomUUID()); notice.assertConfigured.mockReset(); notice.verifyExisting.mockReset().mockResolvedValue(true);
    f = await fixture();
  });
  afterAll(async () => { await app?.close(); await db.$disconnect(); });

  it("accepts the real authenticated API flow and rejects anonymous or unconfirmed deletion", async () => {
    await supertest(app.getHttpServer()).post("/account-deletion").send({ accountType: "CUSTOMER", confirmation: "DELETE" }).expect(401);
    const bearer = jwt.sign({ sub: f.user.id, role: "CUSTOMER" });
    await supertest(app.getHttpServer()).post("/account-deletion").set("Authorization", `Bearer ${bearer}`).send({ accountType: "CUSTOMER", confirmation: "NO" }).expect(400);
    const result = await supertest(app.getHttpServer()).post("/account-deletion").set("Authorization", `Bearer ${bearer}`).send({ accountType: "CUSTOMER", confirmation: "DELETE", receiptToken: f.receiptToken }).expect(201);
    expect(result.body.data.status).toBe("REQUESTED");
    await supertest(app.getHttpServer()).get("/account-deletion/receipt").set("x-deletion-receipt", f.receiptToken).expect(200);
    await supertest(app.getHttpServer()).post("/account-deletion").set("Authorization", `Bearer ${bearer}`).send({ accountType: "CUSTOMER", confirmation: "DELETE" }).expect(401);
  });

  it("requires authenticated active account and reconfirmed DELETE", async () => {
    expect(await validate(plainToInstance(RequestAccountDeletionDto, { accountType: "CUSTOMER", confirmation: "NO" }))).not.toHaveLength(0);
    await expect(service.request(randomUUID(), { accountType: "CUSTOMER", confirmation: "DELETE" })).rejects.toThrow();
    await expect(service.request(f.user.id, { accountType: "CUSTOMER", confirmation: "NO" as never })).rejects.toThrow();
  });
  it("creates one request even with concurrent duplicate confirmation", async () => {
    const [a, b] = await Promise.all([request(), request()]); expect(a.id).toBe(b.id);
    expect(await db.accountDeletionRequest.count({ where: { userId: f.user.id } })).toBe(1);
    expect(a.deadlineAt!.getTime() - a.requestedAt.getTime()).toBeLessThanOrEqual(30 * 86_400_000);
  });
  it("restricts access, suspends wallet and revokes sessions/devices immediately", async () => {
    await request(); expect((await db.user.findUniqueOrThrow({ where: { id: f.user.id } })).deletedAt).not.toBeNull();
    expect(await db.refreshToken.count({ where: { userId: f.user.id, revokedAt: null } })).toBe(0);
    expect(await db.deviceToken.count({ where: { userId: f.user.id } })).toBe(0);
    expect((await db.customerWallet.findUniqueOrThrow({ where: { id: f.wallet.id } })).status).toBe("SUSPENDED");
  });
  it("rejects completed status without retention/external-cleanup evidence", async () => {
    const r = await request(); await expect(service.review(adminId, r.id, { status: "COMPLETED" })).rejects.toThrow();
    expect((await db.accountDeletionRequest.findUniqueOrThrow({ where: { id: r.id } })).erasurePreparedAt).toBeNull();
  });
  it("erases ordinary identity, contact, password, photo and profile preferences", async () => {
    await complete(); const user = await db.user.findUniqueOrThrow({ where: { id: f.user.id }, include: { customerProfile: true } });
    expect(user.fullName).toBe("Deleted Customer"); expect(user.email).toBeNull(); expect(user.phoneNumber).not.toBe(f.user.phoneNumber);
    expect(user.passwordHash).toBe(""); expect(user.profilePhotoUrl).toBeNull(); expect(user.customerProfile!.requireRidePin).toBe(false);
    expect(user.customerProfile!.referralCode).not.toBe(f.user.customerProfile!.referralCode);
  });
  it("removes addresses, auth/OTP/biometric tokens and notification records", async () => {
    await complete(); for (const count of await Promise.all([db.address.count({ where: { userId: f.user.id } }), db.refreshToken.count({ where: { userId: f.user.id } }),
      db.otpVerification.count({ where: { userId: f.user.id } }), db.biometricCredential.count({ where: { userId: f.user.id } }),
      db.deviceToken.count({ where: { userId: f.user.id } }), db.notification.count({ where: { userId: f.user.id } })])) expect(count).toBe(0);
  });
  it("preserves immutable ledger amounts, balances, references and foreign keys", async () => {
    await complete(); const entries = await db.customerWalletLedgerEntry.findMany({ where: { customerId: f.customerId }, orderBy: { reference: "asc" } });
    expect(entries).toHaveLength(2); expect(entries.map(e => e.amount.toString())).toEqual(["1000", "1000"]);
    expect(entries.every(e => e.walletId === f.wallet.id && e.description === null)).toBe(true);
    expect((await db.customerWallet.findUniqueOrThrow({ where: { id: f.wallet.id } })).availableBalance.toString()).toBe("0");
  });
  it("retains utility fulfilment/accounting facts while removing meter/name/token/provider PII", async () => {
    await complete(); const row = await db.utilityTransaction.findUniqueOrThrow({ where: { id: f.utility.id } });
    expect(row.reference).toBe(f.utility.reference); expect(row.providerReference).toBe(f.utility.providerReference); expect(row.status).toBe("SUCCESSFUL");
    expect(row.recipient).toBe("Deleted Customer"); expect(row.mockToken).toBeNull(); expect(row.recipientName).toBeNull();
    expect(row.metadata).toEqual({ personalDataErased: true, walletDebitReference: f.debit.reference, walletDebitStatus: "POSTED" });
  });
  it("preserves order/payment integrity and removes recipient/content/provider payload identity", async () => {
    await complete(); const order = await db.order.findUniqueOrThrow({ where: { id: f.order.id }, include: { items: true } });
    expect(order.totalAmount.toString()).toBe("1000"); expect(order.recipientName).toBeNull(); expect(order.deliveryAddressId).toBeNull();
    expect(order.items[0].specialInstruction).toBeNull(); expect(order.items[0].productName).not.toBe(f.user.fullName);
    const payment = await db.payment.findUniqueOrThrow({ where: { id: f.payment.id } }); expect(payment.gatewayResponse).toBeNull(); expect(payment.transactionReference).toBe(f.payment.transactionReference);
  });
  it("removes personal support/chat/GPS content and minimizes receipt/audit snapshots", async () => {
    await complete(); expect(await db.supportTicket.count({ where: { id: f.ticket.id } })).toBe(0);
    expect(await db.supportTicketMessage.count({ where: { senderUserId: f.user.id } })).toBe(0);
    expect(await db.taxiRideTracePoint.count({ where: { tripId: f.trip.id } })).toBe(0);
    const event = await db.taxiTripEvent.findFirstOrThrow({ where: { tripId: f.trip.id } }); expect(event.metadata).toBeNull(); expect(event.note).toBeNull();
    const audit = await db.adminAuditLog.findFirstOrThrow({ where: { entityId: f.user.id } }); expect(audit.newValue).toBeNull();
  });
  it("sends exactly one notice before contact email is purged and completion commits", async () => {
    notice.send.mockImplementation(async () => {
      const user = await db.user.findUniqueOrThrow({ where: { id: f.user.id } }); expect(user.email).toBe(f.user.email); expect(user.passwordHash).toBe(""); return randomUUID();
    });
    const r = await complete(); await service.review(adminId, r.id, approval);
    expect(notice.send).toHaveBeenCalledTimes(1); expect(await db.adminAuditLog.count({ where: { entityId: r.id, action: "CUSTOMER_ERASURE_COMPLETED" } })).toBe(1);
  });
  it("rolls back partially failed cleanup, never completes, and resumes safely", async () => {
    const r = await request(); const original = (service as any).erase.bind(service); const spy = jest.spyOn(service as any, "erase");
    spy.mockImplementationOnce(async (tx: any, record: any) => { await original(tx, record); throw new Error("synthetic failure"); });
    await expect(service.review(adminId, r.id, approval)).rejects.toThrow();
    expect((await db.accountDeletionRequest.findUniqueOrThrow({ where: { id: r.id } })).status).not.toBe("COMPLETED");
    expect((await db.user.findUniqueOrThrow({ where: { id: f.user.id } })).fullName).toBe(f.user.fullName);
    expect(notice.send).not.toHaveBeenCalled(); await service.review(adminId, r.id, approval);
    expect((await db.user.findUniqueOrThrow({ where: { id: f.user.id } })).email).toBeNull();
  });
  it("does not resend an ambiguous notice and can reconcile the existing provider ID read-only", async () => {
    const r = await request(); notice.send.mockRejectedValueOnce(new Error("ambiguous"));
    await expect(service.review(adminId, r.id, approval)).rejects.toThrow();
    await expect(service.review(adminId, r.id, approval)).rejects.toThrow(ConflictException);
    expect(notice.send).toHaveBeenCalledTimes(1);
    await service.review(adminId, r.id, { ...approval, reconciledNoticeProviderId: randomUUID() });
    expect(notice.verifyExisting).toHaveBeenCalledTimes(1); expect(notice.send).toHaveBeenCalledTimes(1);
  });
  it("resumes a failed final commit without resending a confirmed notice", async () => {
    const r = await request(); const original = (service as any).locked.bind(service); let calls = 0;
    jest.spyOn(service as any, "locked").mockImplementation(async (...args: any[]) => { if (++calls === 3) throw new Error("synthetic finalization failure"); return original(...args); });
    await expect(service.review(adminId, r.id, approval)).rejects.toThrow();
    expect((await db.accountDeletionRequest.findUniqueOrThrow({ where: { id: r.id } })).status).not.toBe("COMPLETED");
    expect((await db.user.findUniqueOrThrow({ where: { id: f.user.id } })).email).toBe(f.user.email);
    await service.review(adminId, r.id, approval); expect(notice.send).toHaveBeenCalledTimes(1);
  });
  it("confirms completion through the saved receipt when there is no email", async () => {
    await db.user.update({ where: { id: f.user.id }, data: { email: null } }); const r = await complete();
    expect(notice.send).not.toHaveBeenCalled(); const status = await receiptController.status(r.requestReference, f.receiptToken);
    expect(status.data.status).toBe("COMPLETED"); expect(JSON.stringify(status)).not.toContain(f.user.fullName);
  });
  it("recovers a lost request response using the saved capability, without exposing identity", async () => {
    const r = await request(); const recovered = await receiptController.recover(f.receiptToken);
    expect(recovered.data.id).toBe(r.id); expect(JSON.stringify(recovered)).not.toContain(f.user.email);
    await expect(receiptController.status(r.requestReference, "wrong")).rejects.toThrow(NotFoundException);
  });
  it("deleted sessions cannot authenticate or recreate profile/device identity", async () => {
    await complete(); const strategy = new JwtStrategy({ getOrThrow: () => "synthetic-jwt-key" } as never, new UsersService(prisma));
    await expect(strategy.validate({ sub: f.user.id, role: "CUSTOMER" })).rejects.toThrow(UnauthorizedException);
    await expect(new CustomersService(prisma).update(f.user.id, { fullName: "Must not recreate" })).rejects.toThrow(UnauthorizedException);
    await expect(new DeviceTokensService(prisma).register(f.user.id, "CUSTOMER", { token: "ExponentPushToken[do-not-register]", platform: "IOS", provider: "EXPO", appSurface: "CUSTOMER_APP" })).rejects.toThrow(UnauthorizedException);
    expect(await db.deviceToken.count({ where: { userId: f.user.id } })).toBe(0);
  });
  it("blocks nonzero wallets, unresolved utility outcomes and active disputes", async () => {
    const r = await request(); await db.customerWallet.update({ where: { id: f.wallet.id }, data: { availableBalance: 1 } });
    await expect(service.review(adminId, r.id, approval)).rejects.toThrow(ConflictException);
    expect(notice.send).not.toHaveBeenCalled(); expect((await db.user.findUniqueOrThrow({ where: { id: f.user.id } })).email).toBe(f.user.email);
  });
  it("never automatically upgrades or erases a historical request", async () => {
    const legacy = await db.accountDeletionRequest.create({ data: { userId: f.user.id, accountType: "CUSTOMER", requestReference: `ADR-${randomUUID()}`, status: "COMPLETED" } });
    await expect(service.review(adminId, legacy.id, approval)).rejects.toThrow(ConflictException);
    expect((await db.user.findUniqueOrThrow({ where: { id: f.user.id } })).fullName).toBe(f.user.fullName);
  });
  it("does not mutate unrelated Customers", async () => {
    const unrelated = await fixture(); await complete(); const user = await db.user.findUniqueOrThrow({ where: { id: unrelated.user.id } });
    expect(user.fullName).toBe(unrelated.user.fullName); expect(user.email).toBe(unrelated.user.email); expect(user.deletedAt).toBeNull();
  });
  it("unlinks a shared owned address without corrupting another Customer's order or identity", async () => {
    const unrelated = await fixture(); const address = await db.address.findFirstOrThrow({ where: { userId: f.user.id } });
    await db.order.update({ where: { id: unrelated.order.id }, data: { deliveryAddressId: address.id } });
    await complete(); const order = await db.order.findUniqueOrThrow({ where: { id: unrelated.order.id } });
    expect(order.deliveryAddressId).toBeNull(); expect(order.recipientName).toBe(unrelated.user.fullName); expect(order.totalAmount.toString()).toBe("1000");
  });
  it.each(["pending-utility", "open-support", "loyalty-value"])("blocks erasure for %s without destroying evidence", async reason => {
    const r = await request();
    if (reason === "pending-utility") await db.utilityTransaction.update({ where: { id: f.utility.id }, data: { status: "PROCESSING" } });
    if (reason === "open-support") await db.supportTicket.update({ where: { id: f.ticket.id }, data: { status: "OPEN" } });
    if (reason === "loyalty-value") await db.customerProfile.update({ where: { id: f.customerId }, data: { loyaltyBalance: 1 } });
    await expect(service.review(adminId, r.id, approval)).rejects.toThrow(ConflictException);
    expect((await db.user.findUniqueOrThrow({ where: { id: f.user.id } })).email).toBe(f.user.email); expect(notice.send).not.toHaveBeenCalled();
  });
  it("does not reopen a completed deletion from a stale Admin review action", async () => {
    const r = await request(); await service.review(adminId, r.id, approval);
    const result = await service.review(adminId, r.id, { status: "IN_REVIEW" });
    expect(result.status).toBe("COMPLETED"); expect(notice.send).toHaveBeenCalledTimes(1);
  });
  it("blocks an unreviewed Partner draft even when there is no Vendor application", async () => {
    const r = await request();
    await db.partnerOnboardingDraft.create({ data: { userId: f.user.id, draftData: { name: f.user.fullName } } });
    await expect(service.review(adminId, r.id, approval)).rejects.toThrow(ConflictException);
    expect((await db.user.findUniqueOrThrow({ where: { id: f.user.id } })).email).toBe(f.user.email);
    expect(notice.send).not.toHaveBeenCalled();
  });
  it("database guards reject stale jobs that bypass API authentication after erasure", async () => {
    await complete();
    await expect(db.user.update({ where: { id: f.user.id }, data: { email: "must-not-restore@example.invalid" } })).rejects.toThrow();
    await expect(db.user.update({ where: { id: f.user.id }, data: { passwordHash: "must-not-restore" } })).rejects.toThrow();
    await expect(db.refreshToken.create({ data: { userId: f.user.id, tokenHash: randomUUID(), expiresAt: new Date() } })).rejects.toThrow();
    await expect(db.notification.create({ data: { userId: f.user.id, title: "Must not recreate", message: "Personal data", type: "SYSTEM_ALERT" } })).rejects.toThrow();
    await expect(db.customerProfile.update({ where: { id: f.customerId }, data: { requireRidePin: true } })).rejects.toThrow();
    await expect(db.user.update({ where: { id: f.user.id }, data: { lastLoginAt: new Date() } })).rejects.toThrow();
  });

  it("expires both receipt paths at 90 days while retaining the minimal audit; cleanup is idempotent", async () => {
    const r = await complete(); const completedAt = new Date("2026-01-01T00:00:00Z");
    await db.accountDeletionRequest.update({ where: { id: r.id }, data: { completedAt } });
    jest.useFakeTimers({ doNotFake: ["nextTick", "setImmediate", "setTimeout", "clearTimeout", "queueMicrotask", "performance"] }).setSystemTime(new Date(completedAt.getTime() + 90 * DAY_MS - 1));
    try {
      expect((await service.publicReceipt(r.requestReference, f.receiptToken)).status).toBe("COMPLETED");
      jest.setSystemTime(new Date(completedAt.getTime() + 90 * DAY_MS));
      await expect(service.publicReceipt(r.requestReference, f.receiptToken)).rejects.toThrow(NotFoundException);
      await expect(service.recoverReceipt(f.receiptToken)).rejects.toThrow(NotFoundException);
      const retention = new DataRetentionService(prisma);
      expect((await retention.expireReceiptCapabilities(new Date(), true)).changed).toBeGreaterThan(0);
      expect((await retention.expireReceiptCapabilities(new Date(), true)).changed).toBe(0);
      expect(await db.accountDeletionRequest.findUnique({ where: { id: r.id } })).not.toBeNull();
    } finally { jest.useRealTimers(); }
  });
  it.each(["RIDER", "VENDOR", "ADMIN", "CUSTOMER"] as const)("erases Customer scope while preserving legitimate %s identity/workspace", async role => {
    await db.user.update({ where: { id: f.user.id }, data: { role, ...(role === "ADMIN" ? { adminRole: "SUPPORT_AGENT" } : {}) } });
    let otherId: string | undefined;
    if (role === "RIDER") otherId = (await db.rider.create({ data: { userId: f.user.id, riderCode: randomUUID(), phoneNumber: "synthetic-other-role" } })).id;
    if (role === "VENDOR") otherId = (await db.vendor.create({ data: { userId: f.user.id, businessName: "Synthetic business", businessCategory: "FOOD", phoneNumber: "synthetic-business", address: "Synthetic business address", city: "Abuja", state: "FCT", status: "ACTIVE" } })).id;
    if (role === "CUSTOMER") otherId = (await db.partnerOnboardingDraft.create({ data: { userId: f.user.id, draftData: { businessName: "Synthetic pending business" } } })).id;
    await db.deviceToken.create({ data: { userId: f.user.id, token: `ExponentPushToken[other-${randomUUID()}]`, platform: "ANDROID", provider: "EXPO", appSurface: role === "ADMIN" ? "ADMIN_PORTAL" : role === "RIDER" ? "RIDER_APP" : "VENDOR_DASHBOARD" } });
    const r = await complete(); const user = await db.user.findUniqueOrThrow({ where: { id: f.user.id } });
    expect(user.accountStatus).toBe("ACTIVE"); expect(user.deletedAt).toBeNull(); expect(user.customerAccessDeletedAt).not.toBeNull();
    expect(user.fullName).toBe(f.user.fullName); expect(user.passwordHash).toBe(f.user.passwordHash);
    const strategy = new JwtStrategy({ getOrThrow: () => "fixture" } as never, new UsersService(prisma));
    expect((await strategy.validate({ sub: user.id, role })).role).toBe(role);
    expect((await db.accountDeletionRequest.findUniqueOrThrow({ where: { id: r.id } })).status).toBe("COMPLETED");
    expect(await db.deviceToken.count({ where: { userId: user.id, appSurface: "CUSTOMER_APP" } })).toBe(0);
    expect(await db.deviceToken.count({ where: { userId: user.id } })).toBe(1);
    expect(await db.address.count({ where: { userId: user.id } })).toBe(0);
    await expect(new CustomersService(prisma).update(user.id, { fullName: "Must not resurrect Customer" })).rejects.toThrow(UnauthorizedException);
    if (role === "RIDER") expect(await db.rider.findUnique({ where: { id: otherId } })).not.toBeNull();
    if (role === "VENDOR") expect((await db.vendor.findUniqueOrThrow({ where: { id: otherId } })).status).toBe("ACTIVE");
    if (role === "CUSTOMER") expect(await db.partnerOnboardingDraft.findUnique({ where: { id: otherId } })).not.toBeNull();
    expect(notice.send).toHaveBeenCalledTimes(1);
  });
  it("preserves a narrowly held utility record while erasing unrelated Customer PII", async () => {
    const previous = process.env.RETENTION_LEGAL_AUTHORIZER_IDS;
    process.env.RETENTION_LEGAL_AUTHORIZER_IDS = adminId;
    try {
      const retention = new DataRetentionService(prisma);
      const hold = await retention.createHold({ actorId: adminId, authorityReference: "SYNTHETIC-LEGAL-CASE", resourceType: "UtilityTransaction", resourceId: f.utility.id, kind: "COURT", reasonCode: "SYNTHETIC-DISPUTE" });
      const r = await complete();
      expect((await db.utilityTransaction.findUniqueOrThrow({ where: { id: f.utility.id } })).mockToken).toBe("synthetic-token");
      expect((await db.user.findUniqueOrThrow({ where: { id: f.user.id } })).email).toBeNull();
      expect(await db.address.count({ where: { userId: f.user.id } })).toBe(0);
      expect((await db.accountDeletionRequest.findUniqueOrThrow({ where: { id: r.id } })).status).toBe("COMPLETED");
      await retention.reviewHold(hold.id, adminId, "SYNTHETIC-RELEASE", "RELEASE");
      expect(await db.dataRetentionHoldEvent.count({ where: { holdId: hold.id } })).toBe(2);
    } finally { if (previous === undefined) delete process.env.RETENTION_LEGAL_AUTHORIZER_IDS; else process.env.RETENTION_LEGAL_AUTHORIZER_IDS = previous; }
  });

  it("replays authenticated deletion tombstones twice without notices, vends or numerical ledger changes", async () => {
    const old = process.env.RESTORE_ISOLATED; process.env.RESTORE_ISOLATED = "true";
    try {
      const item = { userId: f.user.id, customerId: f.customerId, requestReference: `ADR-${randomUUID().toUpperCase()}`, completedAt: new Date().toISOString(), sharedIdentityRetained: false };
      await service.replayTombstone(item); await service.replayTombstone(item);
      const user = await db.user.findUniqueOrThrow({ where: { id: f.user.id } });
      expect(user.email).toBeNull(); expect(user.fullName).toBe("Deleted Customer");
      expect(notice.send).not.toHaveBeenCalled();
      expect(await db.accountDeletionRequest.count({ where: { requestReference: item.requestReference } })).toBe(1);
      expect(await db.customerWalletLedgerEntry.count({ where: { customerId: f.customerId } })).toBe(2);
      expect((await db.customerWallet.findUniqueOrThrow({ where: { id: f.wallet.id } })).availableBalance.toString()).toBe("0");
      expect((await db.utilityTransaction.findUniqueOrThrow({ where: { id: f.utility.id } })).providerReference).toBe(f.utility.providerReference);
    } finally { if (old === undefined) delete process.env.RESTORE_ISOLATED; else process.env.RESTORE_ISOLATED = old; }
  });
});
