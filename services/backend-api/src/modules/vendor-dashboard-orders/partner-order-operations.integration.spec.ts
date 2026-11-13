import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PassportModule } from "@nestjs/passport";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { OrderStatus, PrismaClient } from "@prisma/client";
import { randomUUID, randomInt } from "crypto";
import supertest from "supertest";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtStrategy } from "../auth/jwt.strategy";
import { UsersService } from "../users/users.service";
import { RolesGuard } from "../../common/guards/roles.guard";
import { AuthService } from "../auth/auth.service";
import { PartnerAuthController } from "../auth/partner-auth.controller";
import { PartnerOnboardingGuard, PartnerOnboardingStrategy, PartnerSessionService } from "../auth/partner-session";
import { AllExceptionsFilter } from "../../common/filters/all-exceptions.filter";
import { VendorDashboardOrdersController } from "./vendor-dashboard-orders.controller";
import { VendorDashboardOrdersService } from "./vendor-dashboard-orders.service";
import { VendorOrderStatusService } from "./vendor-order-status.service";
import { VendorOrderEventsService } from "./vendor-order-events.service";
import { VendorOrderAccessGuard } from "./vendor-order-access";
import { VendorOrderRejectionReason } from "./dto/reject-vendor-order.dto";

const url = process.env.KARIGO_PARTNER_P2_TEST_DATABASE_URL;
if (url) { const parsed = new URL(url); if (parsed.hostname !== "127.0.0.1" || parsed.port !== "55443" || parsed.pathname !== "/karigo_partner_p2_20261113") throw new Error("Dedicated loopback synthetic P2 database required."); }
const suite = url ? describe : describe.skip;
jest.setTimeout(120_000);
suite("Partner merchant operations — real HTTP/JWT/PostgreSQL", () => {
  const db = new PrismaClient({ datasourceUrl: url });
  const jwt = new JwtService({ secret: "synthetic-partner-p2-only" });
  const config = { getOrThrow: () => "synthetic-partner-p2-only" } as unknown as ConfigService;
  const events = { emit: jest.fn(async () => undefined) };
  const domain = new VendorOrderStatusService();
  const auth = { logout: jest.fn(), me: jest.fn() };
  const sessions = new PartnerSessionService(db as PrismaService, jwt, auth as unknown as AuthService);
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [PassportModule.register({ defaultStrategy: "jwt" })],
      controllers: [VendorDashboardOrdersController, PartnerAuthController], providers: [
        JwtStrategy, RolesGuard, VendorOrderAccessGuard, VendorOrderStatusService, VendorDashboardOrdersService, PartnerOnboardingGuard, PartnerOnboardingStrategy,
        { provide: PrismaService, useValue: db }, { provide: ConfigService, useValue: config }, { provide: AuthService, useValue: auth },
        { provide: PartnerSessionService, useValue: sessions }, { provide: VendorOrderEventsService, useValue: events },
        { provide: UsersService, useValue: { findByIdForAuth: (id: string) => db.user.findUnique({ where: { id } }) } }
      ] }).compile();
    app = module.createNestApplication(); app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    app.useGlobalFilters(new AllExceptionsFilter()); await app.init();
  });
  afterAll(async () => { await app.close(); await db.$disconnect(); });
  beforeEach(() => events.emit.mockClear());
  const token = (id: string, extra: object = {}) => jwt.sign({ sub: id, role: "VENDOR", jti: randomUUID(), ...extra }, { expiresIn: "15m" });
  async function owner(status: "ACTIVE" | "PENDING_APPROVAL" = "ACTIVE") {
    const id = randomUUID();
    const user = await db.user.create({ data: { id, fullName: "Synthetic merchant", phoneNumber: `+2348${String(randomInt(1_000_000_000)).padStart(9, "0")}`, passwordHash: "synthetic-only", role: "VENDOR", accountStatus: "ACTIVE", phoneVerified: true,
      vendor: { create: { businessName: "Synthetic business", businessCategory: "RESTAURANT", phoneNumber: "synthetic", address: "synthetic", city: "Abuja", state: "FCT", status } } }, include: { vendor: true } });
    return { user, vendor: user.vendor!, token: token(id) };
  }
  async function order(vendorId: string, state: OrderStatus = OrderStatus.PAID) {
    const id = randomUUID();
    const customer = await db.user.create({ data: { fullName: "Unneeded Customer Surname", phoneNumber: `+2348${String(randomInt(1_000_000_000)).padStart(9, "0")}`, passwordHash: "synthetic-only", role: "CUSTOMER", accountStatus: "ACTIVE", phoneVerified: true,
      customerProfile: { create: { referralCode: id } } }, include: { customerProfile: true } });
    const address = await db.address.create({ data: { userId: customer.id, label: "Private home", addressLine: "NEVER_EXPOSE_HOME", city: "Abuja", state: "FCT", deliveryNote: "NEVER_EXPOSE_GATE_CODE" } });
    const row = await db.order.create({ data: { orderNumber: id, vendorId, customerId: customer.customerProfile!.id, serviceCategory: "FOOD", orderStatus: state, paymentStatus: "SUCCESSFUL",
      subtotal: 100, deliveryFee: 10, totalAmount: 110, deliveryOtp: "NEVER_EXPOSE_OTP", customerNote: "NEVER_EXPOSE_DELIVERY_NOTE", deliveryAddressId: address.id,
      items: { create: { productName: "Synthetic meal", unitPrice: 100, quantity: 1, totalPrice: 100, specialInstruction: "No onions" } } } });
    const payment = await db.payment.create({ data: { orderId: row.id, customerId: customer.customerProfile!.id, gateway: "synthetic", transactionReference: randomUUID(), amount: 110,
      paymentStatus: "SUCCESSFUL", gatewayResponse: { privateToken: "NEVER_EXPOSE_PROVIDER_TOKEN" } } });
    return { ...row, payment };
  }
  const detail = async (id: string, access: string) => (await supertest(app.getHttpServer()).get(`/vendor-dashboard/orders/${id}`).set("Authorization", `Bearer ${access}`).expect(200)).body.data;
  const post = (id: string, action: string, access: string, body: object = {}) => supertest(app.getHttpServer()).post(`/vendor-dashboard/orders/${id}/${action}`).set("Authorization", `Bearer ${access}`).send(body);
  const version = (row: { orderStatus: string; updatedAt: string | Date }) => ({ expectedStatus: row.orderStatus, expectedUpdatedAt: new Date(row.updatedAt).toISOString() });

  it("executes the whole merchant lifecycle with one actor history per action and no handoff/complete endpoint", async () => {
    const who = await owner(), row = await order(who.vendor.id);
    let state = await detail(row.id, who.token);
    for (const [action, target] of [["accept", "VENDOR_ACCEPTED"], ["preparing", "PREPARING"], ["ready", "READY_FOR_PICKUP"]]) {
      const response = await post(row.id, action, who.token, version(state)).expect(201); state = response.body.data;
      expect(state.orderStatus).toBe(target);
    }
    expect(state.availableActions).toEqual([]);
    const history = await db.orderStatusHistory.findMany({ where: { orderId: row.id } });
    expect(history).toHaveLength(3); expect(history.every(h => h.changedByUserId === who.user.id && h.changedByRole === "VENDOR")).toBe(true);
    await post(row.id, "handoff", who.token).expect(404); await post(row.id, "complete", who.token).expect(404);
  });
  it("enforces every allowed/forbidden state/action pair using the existing domain", async () => {
    const who = await owner();
    for (const state of Object.values(OrderStatus)) for (const action of ["accept", "reject", "preparing", "ready"]) {
      const row = await order(who.vendor.id, state);
      const body = { ...version(row), ...(action === "reject" ? { reason: "ITEM_UNAVAILABLE" } : {}) };
      const response = await post(row.id, action, who.token, body);
      const allowed = domain.actionsFor(state).includes(action);
      expect(response.status).toBe(allowed ? 201 : 400);
      expect(await db.orderStatusHistory.count({ where: { orderId: row.id } })).toBe(allowed ? 1 : 0);
    }
  });
  it("rejects another owner and a team member without ownership, before mutation", async () => {
    const a = await owner(), b = await owner(), row = await order(a.vendor.id);
    await post(row.id, "accept", b.token, version(row)).expect(404);
    await db.vendorTeamMember.create({ data: { vendorId: a.vendor.id, userId: b.user.id, fullName: "Synthetic team member", role: "VIEWER", invitationStatus: "ACCEPTED" } });
    await post(row.id, "accept", b.token, version(row)).expect(404);
    await post(row.id, "accept", b.token, { ...version(row), vendorId: a.vendor.id }).expect(400);
    expect(await db.orderStatusHistory.count({ where: { orderId: row.id } })).toBe(0);
  });
  it("rejects unapproved businesses, onboarding scope, expiry and disabled accounts", async () => {
    const who = await owner("PENDING_APPROVAL"), row = await order(who.vendor.id);
    await post(row.id, "accept", who.token, version(row)).expect(403);
    await db.vendor.update({ where: { id: who.vendor.id }, data: { status: "ACTIVE" } });
    const scoped = jwt.sign({ sub: who.user.id, sid: randomUUID(), scope: "partner-onboarding" }, { audience: "karigo-partner-onboarding", expiresIn: "15m" });
    await post(row.id, "accept", scoped, version(row)).expect(401);
    await post(row.id, "accept", jwt.sign({ sub: who.user.id }, { expiresIn: -1 }), version(row)).expect(401);
    await db.user.update({ where: { id: who.user.id }, data: { accountStatus: "DEACTIVATED" } });
    await post(row.id, "accept", who.token, version(row)).expect(401);
  });
  it("a Partner sign-out invalidates its exact access token on order reads and writes", async () => {
    const who = await owner(), row = await order(who.vendor.id);
    await supertest(app.getHttpServer()).post("/partner-mobile/session/logout").set("Authorization", `Bearer ${who.token}`).send({}).expect(201);
    await post(row.id, "accept", who.token, version(row)).expect(401);
    await supertest(app.getHttpServer()).get(`/vendor-dashboard/orders/${row.id}`).set("Authorization", `Bearer ${who.token}`).expect(401);
    const marker = await db.partnerMobileSession.findFirstOrThrow({ where: { userId: who.user.id, purpose: "REVOKED_ACCESS" } });
    expect(JSON.stringify(marker)).not.toContain(who.token);
  });
  it("malformed IDs, invalid reasons, unsafe notes and partial versions fail closed", async () => {
    const who = await owner(), row = await order(who.vendor.id);
    await post("not-a-uuid", "accept", who.token).expect(400);
    await post(row.id, "reject", who.token, { reason: "INVENTED_REASON" }).expect(400);
    await post(row.id, "reject", who.token, { reason: "OTHER", details: "password=do-not-store" }).expect(400);
    await post(row.id, "reject", who.token, { reason: "OTHER", details: "x".repeat(501) }).expect(400);
    await post(row.id, "accept", who.token, { expectedStatus: "PAID" }).expect(400);
    expect(await db.orderStatusHistory.count({ where: { orderId: row.id } })).toBe(0);
  });
  it("a paid rejection preserves amounts/provider records and marks refund review only", async () => {
    const who = await owner(), row = await order(who.vendor.id);
    const result = await post(row.id, "reject", who.token, { ...version(row), reason: "ITEM_UNAVAILABLE", details: "Sold out" }).expect(201);
    expect(result.body.data.refundReviewRequired).toBe(true);
    const payment = await db.payment.findUniqueOrThrow({ where: { id: row.payment.id } });
    expect(payment.paymentStatus).toBe("REFUND_PENDING"); expect(Number(payment.amount)).toBe(110); expect(payment.transactionReference).toBe(row.payment.transactionReference);
    expect(await db.orderStatusHistory.count({ where: { orderId: row.id } })).toBe(1);
  });
  it("double submissions serialize to one transition/history/outbox record", async () => {
    const who = await owner(), row = await order(who.vendor.id);
    const results = await Promise.all([post(row.id, "accept", who.token, version(row)), post(row.id, "accept", who.token, version(row))]);
    expect(results.map(r => r.status).sort()).toEqual([201, 409]);
    expect(await db.orderStatusHistory.count({ where: { orderId: row.id } })).toBe(1);
    expect(await db.partnerPushDelivery.count({ where: { entityId: row.id } })).toBe(1);
  });
  function intercepted(beforeClaim: () => Promise<void>, failHistory = false) {
    const proxy = new Proxy(db, { get(target, name) {
      if (name === "$transaction") return (fn: any) => target.$transaction(async tx => {
        const wrapped = new Proxy(tx, { get(t, key) {
          if (key === "order") return new Proxy(t.order, { get(delegate, method) {
            if (method === "updateMany") return async (args: any) => { await beforeClaim(); return delegate.updateMany(args); };
            return Reflect.get(delegate, method);
          } });
          if (key === "orderStatusHistory" && failHistory) return { create: async () => { throw new Error("synthetic history write failure"); } };
          const value = Reflect.get(t, key); return typeof value === "function" ? value.bind(t) : value;
        } });
        return fn(wrapped);
      });
      const value = Reflect.get(target, name); return typeof value === "function" ? value.bind(target) : value;
    } });
    return new VendorDashboardOrdersService(proxy as PrismaService, domain, events as unknown as VendorOrderEventsService);
  }
  it("another actor's update after the merchant read wins; losing reject cannot change payment/history", async () => {
    const who = await owner(), row = await order(who.vendor.id);
    const service = intercepted(async () => { await db.order.update({ where: { id: row.id }, data: { orderStatus: "CANCELLED" } }); });
    await expect(service.reject(who.user.id, row.id, { reason: VendorOrderRejectionReason.ITEM_UNAVAILABLE })).rejects.toMatchObject({ status: 409 });
    expect((await db.order.findUniqueOrThrow({ where: { id: row.id } })).orderStatus).toBe("CANCELLED");
    expect((await db.payment.findUniqueOrThrow({ where: { id: row.payment.id } })).paymentStatus).toBe("SUCCESSFUL");
    expect(await db.orderStatusHistory.count({ where: { orderId: row.id } })).toBe(0);
  });
  it("history failure rolls back the order claim and refund-review flags together", async () => {
    const who = await owner(), row = await order(who.vendor.id);
    const service = intercepted(async () => undefined, true);
    await expect(service.reject(who.user.id, row.id, { reason: VendorOrderRejectionReason.ITEM_UNAVAILABLE })).rejects.toThrow();
    expect((await db.order.findUniqueOrThrow({ where: { id: row.id } })).orderStatus).toBe("PAID");
    expect((await db.payment.findUniqueOrThrow({ where: { id: row.payment.id } })).paymentStatus).toBe("SUCCESSFUL");
    expect(await db.partnerPushDelivery.count({ where: { entityId: row.id } })).toBe(0);
  });
  it("does not expose customer address, OTP, payment provider fields or internal history notes", async () => {
    const who = await owner(), row = await order(who.vendor.id);
    await db.orderStatusHistory.create({ data: { orderId: row.id, newStatus: "PAID", changedByRole: "ADMIN", note: "NEVER_EXPOSE_ADMIN_NOTE" } });
    const result = await detail(row.id, who.token); const response = JSON.stringify(result);
    for (const text of ["NEVER_EXPOSE", "Unneeded Customer Surname", "gatewayResponse", "deliveryOtp", "changedByUserId", "customerId"]) expect(response).not.toContain(text);
    expect(result.customer.name).toBe("Unneeded ****"); expect(result.items[0].specialInstruction).toBe("No onions");
    const mutation = await post(row.id, "accept", who.token, version(row)).expect(201);
    expect(JSON.stringify(mutation.body)).not.toContain("NEVER_EXPOSE");
    const list = await supertest(app.getHttpServer()).get("/vendor-dashboard/orders").set("Authorization", `Bearer ${who.token}`).expect(200);
    expect(JSON.stringify(list.body)).not.toContain("NEVER_EXPOSE");
  });
});
