import { BadRequestException, ForbiddenException, ServiceUnavailableException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { VendorPrivateUploadStorageService, PrivateVendorFile } from "../vendors/vendor-private-upload-storage.service";

import { validatePartnerDocument } from "../../common/utils/partner-file-validation";
export { validatePartnerDocument } from "../../common/utils/partner-file-validation";

@Injectable()
export class PartnerMobileFilesService {
  constructor(private readonly prisma: PrismaService, private readonly storage: VendorPrivateUploadStorageService) {}
  async upload(userId: string, file?: PrivateVendorFile) {
    validatePartnerDocument(file);
    const storageKey = await this.storage.putOnboardingDocument(userId, file!);
    const location = this.storage.storageLocation();
    try {
      const record = await this.prisma.partnerMobileFile.create({ data: { userId, storageKey, storageProvider: location.provider, storageBucket: location.bucket, purpose: "onboarding-document", mimeType: file!.mimetype, size: file!.size } });
      return { id: record.id, url: `/partner-mobile/onboarding/files/${record.id}`, relativeUrl: `/partner-mobile/onboarding/files/${record.id}`, mimeType: record.mimeType, size: record.size, access: "PRIVATE_CONTROLLED", purpose: "onboarding-document", originalName: "Selected Partner document" };
    } catch (error) { await this.storage.deleteOwnedObject(userId, storageKey); throw error; }
  }
  async attachToApplication(userId: string, applicationId: string) {
    const files = await this.prisma.partnerMobileFile.findMany({ where: { userId, deletedAt: null, applicationId: null, documentName: { not: null } } });
    for (const file of files) {
      const documentUrl = `/partner-mobile/onboarding/files/${file.id}`;
      await this.prisma.$transaction(async tx => {
        const application = await tx.vendorApplication.findFirst({ where: { id: applicationId, applicantUserId: userId, deletedAt: null } });
        if (!application) throw new ForbiddenException("Own Partner application required.");
        const existing = await tx.vendorApplicationDocument.findFirst({ where: { applicationId, documentUrl } });
        if (!existing) await tx.vendorApplicationDocument.create({ data: { applicationId, documentUrl, documentType: file.documentType, documentName: file.documentName } });
        await tx.partnerMobileFile.update({ where: { id: file.id, userId }, data: { applicationId } });
      });
    }
  }
  async cleanupWithdrawn(applicationId: string) {
    const application = await this.prisma.vendorApplication.findFirst({ where: { id: applicationId, status: "WITHDRAWN" } });
    if (!application?.applicantUserId) return;
    const held = await this.prisma.dataRetentionHold.count({ where: { resourceId: { in: [application.id, application.applicantUserId] }, releasedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } });
    if (held) throw new ForbiddenException("Retention review is required before document erasure.");
    const files = await this.prisma.partnerMobileFile.findMany({ where: { applicationId, userId: application.applicantUserId, deletedAt: null } });
    for (const file of files) await this.remove(application.applicantUserId, file.id);
    await this.prisma.partnerOnboardingDraft.updateMany({ where: { userId: application.applicantUserId, applicationId }, data: { draftData: {}, accountType: null } });
  }
  async list(userId: string) {
    const files = await this.prisma.partnerMobileFile.findMany({ where: { userId, deletedAt: null }, orderBy: { createdAt: "desc" } });
    const legacy = await this.prisma.vendorOnboardingDocument.findMany({ where: { vendor: { userId }, deletedAt: null }, select: { id: true, documentType: true, documentName: true, documentUrl: true, verificationStatus: true, uploadedAt: true, adminNote: true } });
    const documents = await this.prisma.vendorApplicationDocument.findMany({ where: { application: { applicantUserId: userId } }, select: { documentUrl: true, verificationStatus: true, adminNote: true } });
    return [...legacy, ...files.map(f => ({ id: f.id, documentType: f.documentType, documentName: f.documentName,
      documentUrl: `/partner-mobile/onboarding/files/${f.id}`, verificationStatus: documents.find(d => d.documentUrl === `/partner-mobile/onboarding/files/${f.id}`)?.verificationStatus ?? "PENDING", uploadedAt: f.createdAt.toISOString(), roleScope: "PARTNER" }))];
  }
  private async owned(userId: string, id: string) {
    const record = await this.prisma.partnerMobileFile.findFirst({ where: { id, userId, deletedAt: null } });
    if (!record) throw new NotFoundException("Document not found.");
    return record;
  }
  private assertStorage(record: { storageProvider: string | null; storageBucket: string | null }) {
    const location = this.storage.storageLocation();
    if (!record.storageProvider || !record.storageBucket || record.storageProvider !== location.provider || record.storageBucket !== location.bucket) throw new ServiceUnavailableException("Partner document storage provenance requires review.");
  }
  async read(userId: string, id: string) {
    const record = await this.owned(userId, id);
    this.assertStorage(record);
    return { buffer: await this.storage.readOwnedObject(userId, record.storageKey), mimeType: record.mimeType };
  }
  async label(userId: string, documentUrl: string, documentType: string, documentName?: string) {
    const match = documentUrl.match(/^\/partner-mobile\/onboarding\/files\/([0-9a-f-]{36})$/i);
    if (!match) throw new BadRequestException("Use your own uploaded Partner document.");
    if (!["BUSINESS_REGISTRATION", "OWNER_ID", "ADDRESS_EVIDENCE", "FOOD_HANDLING_EVIDENCE", "SERVICE_CERTIFICATION", "OTHER"].includes(documentType)) throw new BadRequestException("Invalid document type.");
    const record = await this.owned(userId, match[1]);
    await this.prisma.partnerMobileFile.update({ where: { id: record.id }, data: { documentType, documentName: documentName?.slice(0, 120) || "Selected Partner evidence" } });
    const draft = await this.prisma.partnerOnboardingDraft.findUnique({ where: { userId } });
    if (draft?.applicationId) await this.attachToApplication(userId, draft.applicationId);
    return (await this.list(userId)).find(f => f.id === record.id);
  }
  async readForReview(id: string) {
    const record = await this.prisma.partnerMobileFile.findFirst({ where: { id, deletedAt: null, applicationId: { not: null } } });
    if (!record) throw new NotFoundException("Submitted Partner document not found.");
    const application = await this.prisma.vendorApplication.findFirst({ where: { id: record.applicationId!, applicantUserId: record.userId, deletedAt: null } });
    if (!application) throw new NotFoundException("Submitted Partner document not found.");
    return this.read(record.userId, id);
  }
  async remove(userId: string, id: string) {
    const record = await this.owned(userId, id);
    if (record.applicationId) {
      const application = await this.prisma.vendorApplication.findUnique({ where: { id: record.applicationId } });
      if (application?.status === "APPROVED") throw new ForbiddenException("Approved evidence requires reviewed account erasure.");
    }
    this.assertStorage(record);
    await this.storage.deleteOwnedObject(userId, record.storageKey);
    await this.prisma.partnerMobileFile.update({ where: { id }, data: { deletedAt: new Date(), documentName: null } });
    await this.prisma.vendorApplicationDocument.deleteMany({ where: { application: { applicantUserId: userId }, documentUrl: `/partner-mobile/onboarding/files/${record.id}` } });
    return { deleted: true };
  }
}
