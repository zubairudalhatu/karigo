import { Prisma } from "@prisma/client";
import { randomBytes } from "crypto";
import { ServiceUnavailableException } from "@nestjs/common";
import { heldErasureClient } from "./data-retention.service";

// Legacy arbitrary URLs have no safe owned-object deletion contract. Never hide
// those references and report completion while a possible personal file survives.
export async function assertLegacyCaptainObjectsCleared(tx: Prisma.TransactionClient, userId: string) {
  const counts = await Promise.all([
    tx.riderDocument.count({ where: { rider: { userId }, documentUrl: { not: "" } } }),
    tx.deliveryCaptainApplicationDocument.count({ where: { application: { applicantUserId: userId }, documentUrl: { not: "" } } }),
    tx.deliveryCaptainApplication.count({ where: { applicantUserId: userId, profilePhotoUrl: { not: null } } }),
    tx.taxiDriverApplication.count({ where: { applicantUserId: userId, OR: [
      { driverLicenceDocumentUrl: { not: null } }, { vehicleParticularsDocumentUrl: { not: null } }, { insuranceDocumentUrl: { not: null } }
    ] } }),
    tx.rider.count({ where: { userId, photoUrl: { not: null } } })
  ]);
  if (counts.some(Boolean)) throw new ServiceUnavailableException("LEGACY_CAPTAIN_OBJECT_CLEANUP_REQUIRED");
}

// Disable dispatch immediately without discarding active-work/settlement evidence.
export async function suspendCaptainAccess(tx: Prisma.TransactionClient, userId: string, now: Date) {
  await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
  await tx.rider.updateMany({ where: { userId }, data: { availabilityStatus: "OFFLINE", verificationStatus: "SUSPENDED" } });
  await tx.taxiDriverProfile.updateMany({ where: { userId }, data: { isAvailableForTaxi: false, status: "DEACTIVATED" } });
  await tx.captainWorkState.updateMany({ where: { userId }, data: { desiredDeliveryOnline: false, desiredRideOnline: false,
    lastAvailabilityChangeAt: now, version: { increment: 1 } } });
  await tx.deviceToken.deleteMany({ where: { userId, appSurface: "RIDER_APP" } });
  await tx.biometricCredential.deleteMany({ where: { userId, appSurface: "RIDER_APP" } });
}

// Runs only after existing operational blockers and private-object deletion succeed.
// Never updates orders, payments, earnings, remittances or financial ledgers.
export async function minimizeCaptainPersonalData(tx: Prisma.TransactionClient, userId: string, sharedIdentityRetained: boolean, now: Date) {
  // Reuse existing record-scoped hold protection; no hold/worker configuration changes.
  const held = await heldErasureClient(tx, now);
  await held.taxiRideTracePoint.deleteMany({ where: { trip: { driverProfile: { userId } } } });
  await held.taxiTripEvent.updateMany({ where: { actorId: userId, actorType: "DRIVER", eventType: { startsWith: "taxi.trip.message" } },
    data: { actorId: null, note: null, metadata: Prisma.JsonNull } });
  await tx.riderDocument.deleteMany({ where: { rider: { userId } } });
  await tx.deliveryCaptainApplicationDocument.deleteMany({ where: { application: { applicantUserId: userId } } });
  await tx.deliveryCaptainApplication.updateMany({ where: { applicantUserId: userId }, data: {
    fullName: "Deleted Captain", phoneNumber: "ERASED", email: null, address: "ERASED", city: "ERASED", state: "ERASED",
    residentialCityCode: null, residentialStateCode: null, operatingAreaIds: [], primaryOperatingAreaId: null,
    preferredZone: null, vehiclePlateNumber: null, driverLicenceNumber: null, riderExperience: null, profilePhotoUrl: null,
    guarantorName: "ERASED", guarantorPhone: "ERASED", notes: null, adminNote: null, applicantVisibleNote: null,
    trashedAt: now, status: "REJECTED", trashReason: "PERMANENT_CAPTAIN_DELETION" } });
  await tx.taxiDriverApplication.updateMany({ where: { applicantUserId: userId }, data: {
    fullName: "Deleted Captain", phoneNumber: "ERASED", email: null, address: null, city: "ERASED", state: "ERASED",
    residentialCityCode: null, residentialStateCode: null, operatingAreaIds: [], primaryOperatingAreaId: null,
    driverLicenceNumber: null, driverLicenceDocumentUrl: null, driverLicenceExpiry: null,
    vehicleMake: null, vehicleModel: null, vehicleYear: null, vehicleColour: null, vehicleCustomMake: null,
    vehicleCustomModel: null, vehicleCustomColour: null, vehiclePlateNumber: null, vehicleType: null, vehicleOwnership: null,
    vehicleParticularsDocumentUrl: null, insuranceDocumentUrl: null, notes: null, adminNote: null, applicantVisibleNote: null,
    trashedAt: now, status: "REJECTED", trashReason: "PERMANENT_CAPTAIN_DELETION" } });
  await tx.rider.updateMany({ where: { userId }, data: { phoneNumber: "ERASED", photoUrl: null, vehicleType: null,
    plateNumber: null, licenseNumber: null, guarantorName: null, guarantorPhone: null, currentLatitude: null,
    currentLongitude: null, currentLocationUpdatedAt: null, preferredServiceAreas: Prisma.DbNull,
    availabilityStatus: "OFFLINE", verificationStatus: "SUSPENDED", deletedAt: now } });
  await tx.taxiDriverProfile.updateMany({ where: { userId }, data: { fullName: "Deleted Captain", phoneNumber: "ERASED",
    city: "ERASED", state: "ERASED", vehicleMake: null, vehicleModel: null, vehicleYear: null, vehicleColour: null,
    vehiclePlateNumber: null, vehicleType: null, lastKnownLatitude: null, lastKnownLongitude: null, lastSeenAt: null,
    status: "DEACTIVATED", isAvailableForTaxi: false } });
  await tx.captainApplicationDocument.updateMany({ where: { userId, externalDeletionState: "DELETED" }, data: {
    originalFileName: "ERASED", mimeType: "application/octet-stream", adminNote: null, applicantVisibleNote: null } });
  await tx.captainWorkState.deleteMany({ where: { userId } });
  await tx.deviceToken.deleteMany({ where: { userId, appSurface: "RIDER_APP" } });
  await tx.biometricCredential.deleteMany({ where: { userId, appSurface: "RIDER_APP" } });
  if (!sharedIdentityRetained) {
    await tx.refreshToken.deleteMany({ where: { userId } });
    await tx.otpVerification.deleteMany({ where: { userId } });
    await tx.phoneChangeRequest.deleteMany({ where: { userId } });
    await held.notification.deleteMany({ where: { userId } });
    await tx.address.deleteMany({ where: { userId } });
    // Preserve the existing non-governance phone NOT NULL check without retaining
    // a dialable identifier. Deleted/deactivated status still blocks all login.
    await tx.user.update({ where: { id: userId }, data: { fullName: "Deleted Captain", email: null, phoneNumber: `ERASED-CAPTAIN-${userId}`,
      profilePhotoUrl: null, passwordHash: `ERASED-${randomBytes(32).toString("hex")}`, phoneVerified: false,
      emailVerified: false, accountStatus: "DEACTIVATED", deletedAt: now } });
  }
}
