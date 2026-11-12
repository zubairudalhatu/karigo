import { PrismaClient } from "@prisma/client";
import { randomBytes, randomUUID } from "crypto";
import { AccountDeletionService } from "./account-deletion.service";
import { CustomerErasureService } from "./customer-erasure.service";
import { PrismaService } from "../../prisma/prisma.service";
import { AdminAuditService } from "../../common/services/admin-audit.service";
import { CustomerDeletionNoticeService } from "./customer-deletion-notice.service";
import { CaptainUploadStorageService } from "../riders/captain-upload-storage.service";
import { VendorPrivateUploadStorageService } from "../vendors/vendor-private-upload-storage.service";

const url = process.env.KARIGO_PARTNER_P1_TEST_DATABASE_URL;
if (url) { const parsed = new URL(url); if (parsed.hostname !== "127.0.0.1" || parsed.port !== "55443" || parsed.pathname !== "/karigo_partner_p1_20261112") throw new Error("Dedicated local synthetic Partner database required."); }
const suite = url ? describe : describe.skip;
jest.setTimeout(60_000);
suite("Partner permanent whole-account deletion — isolated PostgreSQL", () => {
  const db = new PrismaClient({ datasourceUrl: url });
  const privateStorage = { storageLocation: () => ({ provider: "LOCAL", bucket: "synthetic-private" }), deleteOwnedObject: jest.fn(async () => undefined) };
  const audit = { record: jest.fn(async () => undefined) };
  const customer = new CustomerErasureService(db as PrismaService, {} as CustomerDeletionNoticeService);
  const service = new AccountDeletionService(db as PrismaService, audit as unknown as AdminAuditService, {} as CaptainUploadStorageService,
    privateStorage as unknown as VendorPrivateUploadStorageService, customer);
  const review = { retentionReviewed: true, noIdentifiableHold: true, externalCleanupEvidence: "synthetic/local/evidence" };
  async function fixture() {
    const id = randomUUID();
    const user = await db.user.create({ data: { id, fullName: "Synthetic Partner", phoneNumber: `+234${Date.now().toString().slice(-10)}`,
      email: `${id}@example.test`, passwordHash: "synthetic-hash", role: "VENDOR", accountStatus: "ACTIVE", phoneVerified: true,
      customerProfile: { create: { referralCode: id } }, rider: { create: { riderCode: id, phoneNumber: "synthetic", verificationStatus: "ACTIVE" } },
      vendor: { create: { businessName: "Synthetic business", businessCategory: "RESTAURANT", phoneNumber: "synthetic", address: "synthetic", city: "Abuja", state: "FCT", status: "ACTIVE" } } }, include: { vendor: true, customerProfile: true } });
    await db.vendorPayoutAccount.create({ data: { vendorId: user.vendor!.id, accountName: "Synthetic owner", bankName: "Synthetic bank", accountNumber: "0000000000", maskedAccountNumber: "******0000" } });
    await db.partnerOnboardingDraft.create({ data: { userId: id, draftData: { businessName: "Synthetic business" } } });
    await db.partnerMobileFile.create({ data: { userId: id, storageKey: `synthetic/${id}`, storageProvider: "LOCAL", storageBucket: "synthetic-private", purpose: "onboarding-document", mimeType: "application/pdf", size: 10 } });
    await db.partnerMobileSession.create({ data: { userId: id, refreshHash: randomUUID(), expiresAt: new Date(Date.now() + 100000) } });
    await db.refreshToken.create({ data: { userId: id, tokenHash: randomUUID(), expiresAt: new Date(Date.now() + 100000) } });
    await db.deviceToken.create({ data: { userId: id, token: `ExpoPushToken[${id}]`, provider: "EXPO", platform: "IOS", appSurface: "PARTNER_APP" } });
    return user;
  }
  async function request(userId: string) {
    const proof = randomBytes(32).toString("base64url");
    const receipt = await service.requestPartnerPermanent(userId, "DELETE", proof);
    const record = await db.accountDeletionRequest.findUniqueOrThrow({ where: { requestReference: receipt.requestReference } });
    return { proof, receipt, record };
  }
  afterAll(() => db.$disconnect());
  it("requires explicit confirmation and private proof before writing anything", async () => {
    const user = await fixture();
    await expect(service.requestPartnerPermanent(user.id, "CLOSE", "bad")).rejects.toThrow();
    expect(await db.accountDeletionRequest.count({ where: { userId: user.id } })).toBe(0);
  });
  it("freezes all roles, revokes credentials/devices, retains a read-only receipt and erases ordinary multi-role data", async () => {
    const user = await fixture(); const item = await request(user.id);
    expect(await db.user.findUnique({ where: { id: user.id } })).toMatchObject({ accountStatus: "DEACTIVATED", passwordHash: "" });
    expect(await db.partnerMobileSession.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.deviceToken.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.refreshToken.count({ where: { userId: user.id, revokedAt: null } })).toBe(0);
    await expect(service.partnerDeletionReceipt(item.receipt.requestReference, "wrong")).rejects.toThrow();
    await expect(service.completePartnerPermanent(user.id, item.record.id, review)).resolves.toMatchObject({ status: "COMPLETED", sharedIdentityRetained: false });
    expect(await db.user.findUnique({ where: { id: user.id } })).toMatchObject({ email: null, fullName: "Deleted KariGO account", passwordHash: "" });
    expect(await db.vendor.findUnique({ where: { userId: user.id } })).toMatchObject({ businessName: "Deleted Partner", address: "Deleted Partner", status: "CLOSED" });
    expect(await db.vendorPayoutAccount.findUnique({ where: { vendorId: user.vendor!.id } })).toMatchObject({ accountNumber: "", accountName: "Deleted Partner" });
    expect(await db.rider.findUnique({ where: { userId: user.id } })).toMatchObject({ phoneNumber: "ERASED", availabilityStatus: "OFFLINE" });
    expect(await db.partnerMobileFile.count({ where: { userId: user.id } })).toBe(0);
    expect(await db.partnerOnboardingDraft.count({ where: { userId: user.id } })).toBe(0);
    await expect(service.partnerDeletionReceipt(item.receipt.requestReference, item.proof)).resolves.toMatchObject({ status: "COMPLETED" });
  });
  it("preserves paid financial amounts/references while minimizing personal bank data", async () => {
    const user = await fixture();
    const order = await db.order.create({ data: { orderNumber: randomUUID(), customerId: user.customerProfile!.id, vendorId: user.vendor!.id,
      serviceCategory: "FOOD", orderStatus: "COMPLETED", paymentStatus: "SUCCESSFUL", totalAmount: 100 } });
    const settlement = await db.vendorSettlement.create({ data: { vendorId: user.vendor!.id, orderId: order.id, settlementStatus: "PAID", grossAmount: 100, commissionRate: 10, commissionAmount: 10, netAmount: 90, paymentReference: "synthetic-retained-reference" } });
    const item = await request(user.id); await service.completePartnerPermanent(user.id, item.record.id, review);
    const retained = await db.vendorSettlement.findUniqueOrThrow({ where: { id: settlement.id } });
    expect(Number(retained.netAmount)).toBe(90); expect(retained.paymentReference).toBe("synthetic-retained-reference");
  });
  it("does not complete if private-object cleanup fails", async () => {
    const user = await fixture(); const item = await request(user.id);
    privateStorage.deleteOwnedObject.mockRejectedValueOnce(new Error("synthetic-storage-failure"));
    await expect(service.completePartnerPermanent(user.id, item.record.id, review)).rejects.toThrow();
    expect((await db.accountDeletionRequest.findUniqueOrThrow({ where: { id: item.record.id } })).status).not.toBe("COMPLETED");
    expect(await db.partnerMobileFile.count({ where: { userId: user.id, deletedAt: null } })).toBe(1);
  });
  it("checks Customer balances before any external document is deleted", async () => {
    const user = await fixture();
    await db.customerWallet.create({ data: { customerId: user.customerProfile!.id, availableBalance: 50, ledgerBalance: 50 } });
    const item = await request(user.id); privateStorage.deleteOwnedObject.mockClear();
    await expect(service.completePartnerPermanent(user.id, item.record.id, review)).rejects.toThrow("balances");
    expect(privateStorage.deleteOwnedObject).not.toHaveBeenCalled();
    expect((await db.accountDeletionRequest.findUniqueOrThrow({ where: { id: item.record.id } })).status).not.toBe("COMPLETED");
  });
  it("does not erase records covered by an active order hold", async () => {
    const user = await fixture();
    const order = await db.order.create({ data: { orderNumber: randomUUID(), customerId: user.customerProfile!.id, vendorId: user.vendor!.id, serviceCategory: "FOOD", orderStatus: "COMPLETED" } });
    await db.dataRetentionHold.create({ data: { resourceType: "Order", resourceId: order.id, kind: "LEGAL", authorityReference: "synthetic/review", authorizedById: user.id,
      reasonCode: "SYNTHETIC_HOLD", startedAt: new Date(), nextReviewAt: new Date(Date.now() + 86400_000) } });
    const item = await request(user.id); privateStorage.deleteOwnedObject.mockClear();
    await expect(service.completePartnerPermanent(user.id, item.record.id, review)).rejects.toThrow("hold");
    expect(privateStorage.deleteOwnedObject).not.toHaveBeenCalled();
    expect((await db.accountDeletionRequest.findUniqueOrThrow({ where: { id: item.record.id } })).status).not.toBe("COMPLETED");
  });
  it("blocks unresolved work and requires explicit retention review", async () => {
    const user = await fixture();
    await db.order.create({ data: { orderNumber: randomUUID(), customerId: user.customerProfile!.id, vendorId: user.vendor!.id, serviceCategory: "FOOD", orderStatus: "PREPARING" } });
    const item = await request(user.id);
    await expect(service.completePartnerPermanent(user.id, item.record.id, { ...review, retentionReviewed: false })).rejects.toThrow();
    await expect(service.completePartnerPermanent(user.id, item.record.id, review)).rejects.toThrow();
    expect((await db.accountDeletionRequest.findUniqueOrThrow({ where: { id: item.record.id } })).status).toBe("BLOCKED");
  });
});
