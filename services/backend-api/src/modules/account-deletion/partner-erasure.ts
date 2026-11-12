import { Prisma } from "@prisma/client";

// Preserve transaction amounts/references and statutory audit records, not ordinary
// contact, credential, catalogue or uploaded-document payloads.
export async function minimizePartnerPersonalData(tx: Prisma.TransactionClient, userId: string, now: Date) {
  const vendor = await tx.vendor.findUnique({ where: { userId } });
  const label = "Deleted Partner";
  await tx.otpVerification.deleteMany({ where: { userId } });
  await tx.phoneChangeRequest.deleteMany({ where: { userId } });
  await tx.notification.deleteMany({ where: { userId } });
  await tx.address.deleteMany({ where: { userId } });
  await tx.vendorAccountActivation.deleteMany({ where: { vendor: { userId } } });
  await tx.partnerMobileSession.deleteMany({ where: { userId } });
  await tx.partnerPushPreference.deleteMany({ where: { userId } });
  await tx.partnerPushDelivery.deleteMany({ where: { userId } });
  await tx.partnerMobileFile.deleteMany({ where: { userId, deletedAt: { not: null } } });
  await tx.partnerOnboardingDraft.deleteMany({ where: { userId } });
  await tx.vendorAccountActivation.deleteMany({ where: { userId } });
  await tx.vendorTeamMember.updateMany({ where: { userId },
    data: { fullName: label, email: null, phoneNumber: null, invitationTokenHash: null, revokedAt: now, invitationStatus: "REVOKED" } });
  await tx.vendorTeamMember.updateMany({ where: { invitedByUserId: userId }, data: { invitedByUserId: null } });
  const applications = await tx.vendorApplication.findMany({ where: { applicantUserId: userId }, select: { id: true } });
  const ids = applications.map(row => row.id);
  await tx.vendorApplicationDocument.deleteMany({ where: { applicationId: { in: ids } } });
  await tx.vendorApplicationReview.updateMany({ where: { applicationId: { in: ids } }, data: { notes: null, checklist: Prisma.JsonNull } });
  await tx.vendorApplicationStatusHistory.updateMany({ where: { applicationId: { in: ids } }, data: { note: null } });
  await tx.vendorApplication.updateMany({ where: { applicantUserId: userId }, data: {
    businessName: label, tradingName: null, businessType: null, businessDescription: label,
    businessAddress: label, city: label, state: label, area: null, serviceAreas: Prisma.JsonNull,
    operatingHours: null, businessPhoneNumber: "", businessEmail: "", websiteOrSocialLink: null,
    contactFullName: label, contactRole: label, contactPhoneNumber: "", contactEmail: "",
    brandAssets: Prisma.JsonNull, documentPlaceholders: Prisma.JsonNull, trashReason: null, trashNote: null, deletedAt: now
  } });
  await tx.partnerOnboardingPayment.updateMany({ where: { agreement: { applicantUserId: userId } }, data: { authorizationUrl: null, providerResponse: Prisma.JsonNull, failureReason: null } });
  await tx.partnerOnboardingFeeWaiver.updateMany({ where: { agreement: { applicantUserId: userId } }, data: { reason: "Retained financial adjustment", note: null } });
  await tx.adminAuditLog.updateMany({ where: { OR: [{ entityId: userId }, ...(vendor ? [{ entityId: vendor.id }] : []), { entityId: { in: ids } }] }, data: { oldValue: Prisma.JsonNull, newValue: Prisma.JsonNull, ipAddress: null } });
  if (!vendor) return;
  await tx.vendorPayoutAccount.updateMany({ where: { vendorId: vendor.id }, data: {
    accountName: label, bankName: label, bankCode: null, accountNumber: "", maskedAccountNumber: "",
    rejectionReason: null, vendorVisibleNote: null, internalNote: null
  } });
  await tx.vendorTeamMember.updateMany({ where: { vendorId: vendor.id }, data: {
    invitationTokenHash: null, revokedAt: now, invitationStatus: "REVOKED"
  } });
  await tx.product.updateMany({ where: { vendorId: vendor.id }, data: { isAvailable: false, isActive: false, deletedAt: now, name: label, description: null, imageUrl: null } });
  await tx.vendorService.updateMany({ where: { vendorId: vendor.id }, data: { isAvailable: false, status: "ARCHIVED", deletedAt: now, name: label, description: null, imageUrl: null, serviceAreas: Prisma.JsonNull, internalNote: null } });
  await tx.vendorBranch.updateMany({ where: { vendorId: vendor.id }, data: { name: label, address: label, city: label, state: label,
    area: null, phoneNumber: null, latitude: null, longitude: null, status: "CLOSED" } });
  await tx.vendorOnboardingDocument.updateMany({ where: { vendorId: vendor.id }, data: { documentName: null, documentUrl: "", deletedAt: now } });
  await tx.vendorAuditLog.updateMany({ where: { vendorId: vendor.id }, data: { oldValue: Prisma.JsonNull, newValue: Prisma.JsonNull } });
  await tx.vendor.update({ where: { id: vendor.id }, data: { businessName: label, description: null, address: label, city: label, state: label,
    phoneNumber: "", email: null, latitude: null, longitude: null, logoUrl: null, coverImageUrl: null,
    bankName: null, accountNumber: null, accountName: null, status: "CLOSED", isOpen: false, deletedAt: now } });
}
