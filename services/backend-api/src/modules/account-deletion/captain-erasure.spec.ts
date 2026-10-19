import { PrismaService } from "../../prisma/prisma.service";
import { AccountDeletionService } from "./account-deletion.service";
import { assertLegacyCaptainObjectsCleared, minimizeCaptainPersonalData, suspendCaptainAccess } from "./captain-erasure";
import { assertCaptainNotDeleted } from "../../common/utils/captain-deletion";

const userId = "11111111-1111-4111-8111-111111111111";
const token = "A".repeat(43);
function fixture() {
  const delegates = ["refreshToken", "rider", "taxiDriverProfile", "captainWorkState", "deviceToken", "riderDocument",
    "deliveryCaptainApplicationDocument", "deliveryCaptainApplication", "taxiDriverApplication", "captainApplicationDocument",
    "address", "user", "accountDeletionRequest", "vendorTeamMember", "partnerOnboardingDraft", "partnerCommercialAgreement",
    "serviceProviderApplication", "adminAuditLog", "dataRetentionHold", "taxiRideTracePoint", "taxiTripEvent",
    "biometricCredential", "otpVerification", "phoneChangeRequest", "notification"];
  const tx: any = { $queryRaw: jest.fn().mockResolvedValue([]) };
  for (const name of delegates) tx[name] = { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn().mockResolvedValue([]),
    create: jest.fn(), update: jest.fn(), findUniqueOrThrow: jest.fn(), updateMany: jest.fn(), deleteMany: jest.fn(), count: jest.fn().mockResolvedValue(0) };
  tx.$transaction = jest.fn(async (fn: any) => fn(tx));
  const user = { id: userId, role: "RIDER", accountStatus: "ACTIVE", deletedAt: null, adminRole: null,
    customerProfile: null, vendor: null, rider: { id: "rider" }, taxiDriverProfiles: [],
    deliveryCaptainApplications: [], taxiDriverApplications: [], vendorApplications: [], phoneNumber: null, email: null };
  tx.user.findUnique.mockResolvedValue(user);
  tx.accountDeletionRequest.create.mockImplementation(async ({ data }: any) => ({ id: userId, ...data,
    requestedAt: new Date(), completedAt: null }));
  const storage = { deleteObject: jest.fn().mockResolvedValue(undefined), storageLocation: jest.fn(() => ({ provider: "GCS", bucket: "synthetic-private" })) };
  const customerErasure = { request: jest.fn().mockResolvedValue({ status: "REQUESTED" }) };
  const service = new AccountDeletionService(tx as PrismaService, { record: jest.fn() } as never, storage as never, {} as never, customerErasure as never);
  return { tx, user, storage, service, customerErasure };
}

describe("Permanent Captain deletion (local synthetic fixtures)", () => {
  it("requires a saved capability and never modifies existing Android legacy semantics", async () => {
    const { service, tx } = fixture();
    await expect(service.request(userId, { accountType: "CAPTAIN", permanent: true, confirmation: "DELETE" })).rejects.toThrow("receipt");
    expect(tx.accountDeletionRequest.create).not.toHaveBeenCalled();
  });
  it("atomically records request/hash/audit and disables Captain access without dropping active work locks", async () => {
    const { service, tx } = fixture();
    const result = await service.request(userId, { accountType: "CAPTAIN", permanent: true, confirmation: "DELETE", receiptToken: token });
    expect(result.status).toBe("REQUESTED");
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.accountDeletionRequest.create.mock.calls[0][0].data.receiptTokenHash).not.toBe(token);
    expect(JSON.stringify(result)).not.toContain(token);
    expect(tx.rider.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { availabilityStatus: "OFFLINE", verificationStatus: "SUSPENDED" } }));
    expect(tx.captainWorkState.updateMany.mock.calls[0][0].data).not.toHaveProperty("activeRideTripId");
    expect(tx.deviceToken.deleteMany).toHaveBeenCalledWith({ where: { userId, appSurface: "RIDER_APP" } });
    expect(tx.adminAuditLog.create.mock.calls[0][0].data.action).toBe("CAPTAIN_PERMANENT_DELETION_REQUESTED");
  });
  it("idempotently returns the existing request with the same receipt and rejects replacement", async () => {
    const { service, tx } = fixture();
    await service.request(userId, { accountType: "CAPTAIN", permanent: true, confirmation: "DELETE", receiptToken: token });
    const prior = { id: userId, ...tx.accountDeletionRequest.create.mock.calls[0][0].data, requestedAt: new Date(), completedAt: null };
    tx.accountDeletionRequest.findFirst.mockResolvedValue(prior);
    await service.request(userId, { accountType: "CAPTAIN", permanent: true, confirmation: "DELETE", receiptToken: token });
    expect(tx.accountDeletionRequest.create).toHaveBeenCalledTimes(1);
    await expect(service.request(userId, { accountType: "CAPTAIN", permanent: true, confirmation: "DELETE", receiptToken: "B".repeat(43) })).rejects.toThrow("existing");
  });
  it("preserves a genuine Customer identity and other business membership", async () => {
    const { service, tx } = fixture();
    tx.vendorTeamMember.count.mockResolvedValue(1);
    await service.request(userId, { accountType: "CAPTAIN", permanent: true, confirmation: "DELETE", receiptToken: token });
    expect(tx.accountDeletionRequest.create.mock.calls[0][0].data.sharedIdentityRetained).toBe(true);
    await minimizeCaptainPersonalData(tx, userId, true, new Date());
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(tx.address.deleteMany).not.toHaveBeenCalled();
  });
  it("records explicit whole-account consent before starting the unchanged Customer erasure pipeline", async () => {
    const { service, tx, user, customerErasure } = fixture();
    Object.assign(user, { role: "CUSTOMER", customerProfile: { id: "synthetic-customer" } });
    const receipt = await service.request(userId, { accountType: "COMPLETE_ACCOUNT", permanent: true, confirmation: "DELETE", receiptToken: token });
    expect(receipt.accountType).toBe("COMPLETE_ACCOUNT");
    expect(customerErasure.request).toHaveBeenCalledTimes(1);
    expect(customerErasure.request.mock.calls[0][1]).toMatchObject({ accountType: "CUSTOMER", confirmation: "DELETE" });
    expect(customerErasure.request.mock.calls[0][1].receiptToken).not.toBe(token);
    expect(tx.adminAuditLog.create.mock.invocationCallOrder[0]).toBeLessThan(customerErasure.request.mock.invocationCallOrder[0]);
    expect(tx.user.create).not.toHaveBeenCalled();
  });
  it("does not start Customer erasure for Captain-only consent or guess deletion authority over another genuine business role", async () => {
    const { service, tx, user, customerErasure } = fixture();
    Object.assign(user, { customerProfile: { id: "synthetic-customer" } });
    await service.request(userId, { accountType: "CAPTAIN", permanent: true, confirmation: "DELETE", receiptToken: token });
    expect(customerErasure.request).not.toHaveBeenCalled();
    Object.assign(user, { vendor: { id: "synthetic-vendor" } });
    tx.accountDeletionRequest.create.mockClear();
    await expect(service.request(userId, { accountType: "COMPLETE_ACCOUNT", permanent: true, confirmation: "DELETE", receiptToken: token })).rejects.toThrow("role-specific deletion review");
    expect(tx.accountDeletionRequest.create).not.toHaveBeenCalled();
    expect(customerErasure.request).not.toHaveBeenCalled();
  });
  it("cannot complete whole-account deletion before required Customer erasure", async () => {
    const { service, tx, user, storage } = fixture();
    tx.accountDeletionRequest.findUnique.mockResolvedValue({ id: userId, userId, accountType: "COMPLETE_ACCOUNT", erasureVersion: 2, status: "REQUESTED", user: { ...user, customerProfile: { id: "synthetic-customer" } } });
    await expect(service.adminUpdate(userId, userId, { status: "COMPLETED" })).rejects.toThrow("completed Customer erasure");
    expect(storage.deleteObject).not.toHaveBeenCalled();
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  it("minimizes Captain profile/application/contact/vehicle/documents without touching money", async () => {
    const { tx } = fixture();
    await minimizeCaptainPersonalData(tx, userId, false, new Date());
    expect(tx.rider.updateMany.mock.calls[0][0].data).toMatchObject({ phoneNumber: "ERASED", licenseNumber: null, guarantorPhone: null, photoUrl: null, currentLatitude: null });
    expect(tx.deliveryCaptainApplication.updateMany.mock.calls[0][0].data).toMatchObject({ address: "ERASED", guarantorName: "ERASED", profilePhotoUrl: null });
    expect(tx.taxiDriverApplication.updateMany.mock.calls[0][0].data).toMatchObject({ driverLicenceNumber: null, vehiclePlateNumber: null });
    expect(tx.user.update.mock.calls[0][0].data).toMatchObject({ accountStatus: "DEACTIVATED", phoneNumber: null, email: null });
    expect(tx).not.toHaveProperty("payment"); expect(tx).not.toHaveProperty("riderEarning");
  });
  it("does not require authentication for the sanitized completion receipt, and expires it", async () => {
    const { tx, service } = fixture();
    tx.accountDeletionRequest.findFirst.mockResolvedValue({ requestReference: "ADR-SYNTHETIC", status: "COMPLETED", requestedAt: new Date(), completedAt: new Date(), deadlineAt: null, sharedIdentityRetained: false });
    expect(await service.captainDeletionReceipt(token)).toMatchObject({ status: "COMPLETED", canCancel: false });
    tx.accountDeletionRequest.findFirst.mockResolvedValue({ completedAt: new Date(Date.now() - 91 * 86400_000) });
    await expect(service.captainDeletionReceipt(token)).rejects.toThrow("not found");
    await expect(service.captainDeletionReceipt("invalid")).rejects.toThrow("not found");
  });
  it("keeps deletion fail-closed for onboarding/operations even if a profile is reactivated", () => {
    expect(() => assertCaptainNotDeleted({ accountDeletionRequests: [{ id: userId }] })).toThrow("deletion");
    expect(() => assertCaptainNotDeleted({ accountDeletionRequests: [] })).not.toThrow();
  });
  it("does not report legacy private objects deleted merely because their database links can be erased", async () => {
    const { tx } = fixture();
    tx.riderDocument.count.mockResolvedValue(1);
    await expect(assertLegacyCaptainObjectsCleared(tx, userId)).rejects.toThrow("LEGACY_CAPTAIN_OBJECT_CLEANUP_REQUIRED");
    expect(tx.riderDocument.deleteMany).not.toHaveBeenCalled();
    tx.riderDocument.count.mockResolvedValue(0);
    await expect(assertLegacyCaptainObjectsCleared(tx, userId)).resolves.toBeUndefined();
  });
  it("revokes sessions and only Captain device tokens", async () => {
    const { tx } = fixture();
    await suspendCaptainAccess(tx, userId, new Date());
    expect(tx.refreshToken.updateMany).toHaveBeenCalled();
    expect(tx.deviceToken.deleteMany.mock.calls[0][0].where.appSurface).toBe("RIDER_APP");
  });
  it("excludes a record-scoped held trace from ordinary Captain minimization", async () => {
    const { tx } = fixture();
    tx.dataRetentionHold.findMany.mockResolvedValue([{ resourceType: "TaxiRideTracePoint", resourceId: "held-point", kind: "LEGAL",
      startedAt: new Date(0), expiresAt: null, releasedAt: null, nextReviewAt: new Date(Date.now() + 86400_000) }]);
    await minimizeCaptainPersonalData(tx, userId, true, new Date());
    expect(tx.taxiRideTracePoint.deleteMany.mock.calls[0][0].where.AND[1]).toEqual({ id: { notIn: ["held-point"] } });
  });
  it("fails closed for unknown or mismatched document storage instead of accepting deletion in the wrong bucket", async () => {
    const { tx, service, storage, user } = fixture();
    for (const location of [{}, { storageProvider: "GCS", storageBucket: "different-bucket" }]) {
      tx.captainApplicationDocument.findMany.mockResolvedValue([{ id: "document", objectKey: "synthetic-object", ...location }]);
      await expect((service as any).reconcileStoredObjectsForCompletion(userId, user, "CAPTAIN", true)).rejects.toThrow("STORAGE_LOCATION_UNVERIFIED");
    }
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });
  it("deletes even linked application objects for permanent deletion, and fails on external storage failure", async () => {
    const { tx, service, storage, user } = fixture();
    tx.captainApplicationDocument.findMany.mockResolvedValue([{ id: "document", objectKey: "synthetic-object", storageProvider: "GCS", storageBucket: "synthetic-private", deliveryApplicationId: "application" }]);
    await (service as any).reconcileStoredObjectsForCompletion(userId, user, "CAPTAIN", true);
    expect(storage.deleteObject).toHaveBeenCalledWith("synthetic-object");
    expect(tx.captainApplicationDocument.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ externalDeletionState: "DELETED" }) }));
    storage.deleteObject.mockRejectedValue(new Error("synthetic failure"));
    await expect((service as any).reconcileStoredObjectsForCompletion(userId, user, "CAPTAIN", true)).rejects.toThrow("storage cleanup");
    expect(tx.captainApplicationDocument.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ externalDeletionState: "DELETION_FAILED" }) }));
  });
});
