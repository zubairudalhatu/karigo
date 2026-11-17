import { validatePartnerDocument } from "../../common/utils/partner-file-validation";
import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, ProductCategory, ServiceCategory, StoredObjectDeletionState, VendorEvidenceAvailabilityState, VendorServiceStatus } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { extname, join } from "path";
import { ApplicationDocumentDto } from "../../common/dto/application-document.dto";
import { PrismaService } from "../../prisma/prisma.service";
import { publicUserSelect } from "../users/users.service";
import { ListVendorsQueryDto } from "./dto/list-vendors-query.dto";
import { UpdateVendorProfileDto } from "./dto/update-vendor-profile.dto";
import { assignableTeamRoles, InviteVendorTeamMemberDto, UpdateVendorTeamMemberDto } from "./dto/vendor-team.dto";
import { UpsertVendorBranchDto } from "./dto/vendor-branch.dto";
import { UpdateVendorServiceDto, VendorServiceInputDto } from "./dto/vendor-service.dto";
import { VendorUploadPurpose } from "./dto/vendor-upload.dto";
import { resolvePartnerCapabilities } from "./partner-capabilities";
import { VendorPrivateUploadStorageService } from "./vendor-private-upload-storage.service";

export interface VendorUploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DOCUMENT_MIME_TYPES = [...IMAGE_MIME_TYPES, "application/pdf"];
const UPLOAD_PURPOSES: Record<VendorUploadPurpose, { directory: string; mimeTypes: string[]; maxBytes: number }> = {
  [VendorUploadPurpose.ONBOARDING_DOCUMENT]: { directory: "onboarding-documents", mimeTypes: DOCUMENT_MIME_TYPES, maxBytes: 10 * 1024 * 1024 },
  [VendorUploadPurpose.PRODUCT_IMAGE]: { directory: "product-images", mimeTypes: IMAGE_MIME_TYPES, maxBytes: 5 * 1024 * 1024 },
  [VendorUploadPurpose.SERVICE_IMAGE]: { directory: "service-images", mimeTypes: IMAGE_MIME_TYPES, maxBytes: 5 * 1024 * 1024 },
  [VendorUploadPurpose.LOGO]: { directory: "branding", mimeTypes: IMAGE_MIME_TYPES, maxBytes: 5 * 1024 * 1024 },
  [VendorUploadPurpose.COVER]: { directory: "branding", mimeTypes: IMAGE_MIME_TYPES, maxBytes: 5 * 1024 * 1024 }
};

@Injectable()
export class VendorsService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly config?: ConfigService,
    @Optional() private readonly privateUploads?: VendorPrivateUploadStorageService
  ) {}

  private profileWithoutBankSecrets<T extends { accountNumber?: unknown; accountName?: unknown; bankName?: unknown }>(profile: T) {
    const { accountNumber: _number, accountName: _name, bankName: _bank, ...safe } = profile;
    if ("teamMembers" in safe && Array.isArray(safe.teamMembers)) return {...safe,teamMembers:safe.teamMembers.map(member=>this.teamView(member))};
    return safe;
  }

  private teamView<T extends {invitationTokenHash?:unknown}>(member:T) { const {invitationTokenHash: _hash,...safe}=member;return safe; }

  async me(userId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { userId, deletedAt: null },
      include: {
        user: { select: publicUserSelect },
        category: true,
        branches: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
        teamMembers: { orderBy: { createdAt: "desc" }, take: 20 },
        onboardingDocuments: { orderBy: { uploadedAt: "desc" } },
        sourceApplication: { select: { reference: true, tradingName: true } }
      }
    });

    if (!vendor) {
      throw new NotFoundException("Vendor profile not found");
    }

    return {
      ...this.profileWithoutBankSecrets(vendor),
      onboardingDocuments: vendor.onboardingDocuments.map((document) => this.onboardingDocumentView(document))
    };
  }

  async update(userId: string, dto: UpdateVendorProfileDto) {
    const vendor = await this.requireVendorForUser(userId);
    if (dto.openingTime !== undefined || dto.closingTime !== undefined) {
      if (!resolvePartnerCapabilities(vendor).canAccessWorkspace) throw new ForbiddenException("Approved Partner owner access required");
      for (const time of [dto.openingTime,dto.closingTime]) if (time !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new BadRequestException("Business hours must use HH:mm");
    }
    const updated = await this.prisma.vendor.update({
      where: { id: vendor.id },
      data: dto,
      include: {
        user: { select: publicUserSelect },
        category: true,
        branches: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
        teamMembers: { orderBy: { createdAt: "desc" }, take: 20 },
        sourceApplication: { select: { reference: true, tradingName: true } }
      }
    });
    await this.logVendorAudit(vendor.id, userId, "vendor.profile.updated", "Vendor", vendor.id, {
      fields: Object.keys(dto)
    });
    return this.profileWithoutBankSecrets(updated);
  }

  async capabilities(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        accountStatus: true,
        deletedAt: true,
        vendor: {
          select: {
            id: true,
            status: true,
            deletedAt: true,
            businessCategory: true,
            sourceApplication: {
              select: {
                businessCategory: true,
                businessType: true,
                catalogueCategory: true,
                status: true
              }
            },
            user: {
              select: {
                accountStatus: true,
                deletedAt: true
              }
            }
          }
        }
      }
    });
    if (!user || user.deletedAt) {
      throw new NotFoundException("KariGO account not found");
    }
    if (user.vendor) {
      return resolvePartnerCapabilities(user.vendor);
    }

    const application = await this.prisma.vendorApplication.findFirst({
      where: { applicantUserId: userId, deletedAt: null },
      orderBy: { submittedAt: "desc" },
      select: {
        businessCategory: true,
        businessType: true,
        catalogueCategory: true,
        status: true
      }
    });
    return resolvePartnerCapabilities(null, application);
  }

  async team(userId: string) {
    const vendor = await this.requireOperationsOwner(userId);
    const members=await this.prisma.vendorTeamMember.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: "desc" }
    });
    return members.map(member=>this.teamView(member));
  }

  async inviteTeamMember(userId: string, dto: InviteVendorTeamMemberDto) {
    if (!dto.email && !dto.phoneNumber) {
      throw new BadRequestException("Provide either an email address or phone number for the team invitation.");
    }
    const vendor = await this.requireOperationsOwner(userId);
    if (!assignableTeamRoles.includes(dto.role as typeof assignableTeamRoles[number])) throw new ForbiddenException("Ownership cannot be assigned by invitation");
    const invitationToken = randomBytes(32).toString("base64url");
    const member = await this.prisma.vendorTeamMember.create({
      data: {
        vendorId: vendor.id,
        fullName: dto.fullName,
        email: dto.email,
        phoneNumber: dto.phoneNumber,
        role: dto.role,
        invitationTokenHash: this.hashSecret(invitationToken),
        invitedByUserId: userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });
    await this.logVendorAudit(vendor.id, userId, "vendor.team.invited", "VendorTeamMember", member.id, {
      role: member.role,
      hasEmail: Boolean(member.email),
      hasPhone: Boolean(member.phoneNumber)
    });
    return { ...this.teamView(member), invitationIssued: true, invitationTokenReturned: false };
  }

  async updateTeamMember(userId: string, memberId: string, dto: UpdateVendorTeamMemberDto) {
    const vendor = await this.requireOperationsOwner(userId);
    const member = await this.prisma.vendorTeamMember.findFirst({ where: { id: memberId, vendorId: vendor.id } });
    if (!member) throw new NotFoundException("Vendor team member not found");
    if (dto.role && !assignableTeamRoles.includes(dto.role as typeof assignableTeamRoles[number])) throw new ForbiddenException("Ownership cannot be assigned here");
    if (member.invitationStatus !== "PENDING") throw new BadRequestException("Only pending invitation roles can be changed");
    if (member.role === "OWNER" || member.userId === vendor.userId) throw new ForbiddenException("Business ownership cannot be removed or reassigned here");
    const updated = await this.prisma.vendorTeamMember.update({
      where: { id: member.id },
      data: dto
    });
    await this.logVendorAudit(vendor.id, userId, "vendor.team.updated", "VendorTeamMember", member.id, { role: updated.role });
    return this.teamView(updated);
  }

  async revokeTeamMember(userId: string, memberId: string) {
    const vendor = await this.requireOperationsOwner(userId);
    const member = await this.prisma.vendorTeamMember.findFirst({ where: { id: memberId, vendorId: vendor.id } });
    if (!member) throw new NotFoundException("Vendor team member not found");
    if (member.role === "OWNER" || member.userId === vendor.userId) throw new ForbiddenException("Business ownership cannot be removed or reassigned here");
    const updated = await this.prisma.vendorTeamMember.update({
      where: { id: member.id },
      data: { invitationStatus: "REVOKED", revokedAt: new Date(), invitationTokenHash: null }
    });
    await this.logVendorAudit(vendor.id, userId, "vendor.team.revoked", "VendorTeamMember", member.id, { role: updated.role });
    return this.teamView(updated);
  }

  async branches(userId: string) {
    const vendor = await this.requireOperationsOwner(userId);
    return this.prisma.vendorBranch.findMany({
      where: { vendorId: vendor.id },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }]
    });
  }

  async createBranch(userId: string, dto: UpsertVendorBranchDto) {
    const vendor = await this.requireOperationsOwner(userId);
    const branch = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"vendor-branches:"+vendor.id}))::text`;
      if (dto.isPrimary && dto.status && dto.status !== "ACTIVE") throw new BadRequestException("Primary branch must be active");
      if (dto.isPrimary) {
        await tx.vendorBranch.updateMany({ where: { vendorId: vendor.id, isPrimary: true }, data: { isPrimary: false } });
      }
      return tx.vendorBranch.create({ data: { ...dto, vendorId: vendor.id } });
    });
    await this.logVendorAudit(vendor.id, userId, "vendor.branch.created", "VendorBranch", branch.id, {
      name: branch.name,
      isPrimary: branch.isPrimary
    });
    return branch;
  }

  async updateBranch(userId: string, branchId: string, dto: Partial<UpsertVendorBranchDto>) {
    const vendor = await this.requireOperationsOwner(userId);
    const existing = await this.prisma.vendorBranch.findFirst({ where: { id: branchId, vendorId: vendor.id } });
    if (!existing) throw new NotFoundException("Vendor branch not found");
    const branch = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${"vendor-branches:"+vendor.id}))::text`;
      const current=await tx.vendorBranch.findFirst({where:{id:branchId,vendorId:vendor.id}});
      if (!current) throw new NotFoundException("Vendor branch not found");
      if (dto.isPrimary && (dto.status ?? current.status) !== "ACTIVE") throw new BadRequestException("Primary branch must be active");
      if (dto.isPrimary) {
        await tx.vendorBranch.updateMany({ where: { vendorId: vendor.id, isPrimary: true, id: { not: branchId } }, data: { isPrimary: false } });
      }
      return tx.vendorBranch.update({ where: { id: branchId }, data: {...dto,...(dto.status&&dto.status!=="ACTIVE"?{isPrimary:false}:{})} });
    });
    await this.logVendorAudit(vendor.id, userId, "vendor.branch.updated", "VendorBranch", branch.id, {
      fields: Object.keys(dto)
    });
    return branch;
  }

  private async requireOperationsOwner(userId:string) {
    const vendor=await this.requireVendorForUser(userId);
    if (!resolvePartnerCapabilities(vendor).canAccessWorkspace || vendor.userId!==userId) throw new ForbiddenException("Approved business owner access required");
    return vendor;
  }
  async operationsSummary(userId:string) {
    const vendor=await this.requireOperationsOwner(userId);
    const [branchCount,activeBranchCount,primary,teamCount,pendingInvitations,unreadNotifications]=await Promise.all([
      this.prisma.vendorBranch.count({where:{vendorId:vendor.id}}),this.prisma.vendorBranch.count({where:{vendorId:vendor.id,status:"ACTIVE"}}),
      this.prisma.vendorBranch.findFirst({where:{vendorId:vendor.id,isPrimary:true,status:"ACTIVE"},select:{id:true,name:true}}),
      this.prisma.vendorTeamMember.count({where:{vendorId:vendor.id,invitationStatus:{not:"REVOKED"}}}),this.prisma.vendorTeamMember.count({where:{vendorId:vendor.id,invitationStatus:"PENDING",expiresAt:{gt:new Date()}}}),
      this.prisma.notification.count({where:{...this.partnerNotificationWhere(userId),isRead:false}})
    ]);
    return {workspaceRole:"OWNER",canManageBranches:true,canManageTeamInvitations:true,canManageHours:true,staffAccessSupported:false,assignableTeamRoles,branchCount,activeBranchCount,primary,teamCount,pendingInvitations,unreadNotifications};
  }
  private partnerNotificationWhere(userId:string) { return {userId,entityType:{in:["Order","VendorSettlement","VendorApplication","Vendor","SupportTicket"]}}; }
  async partnerNotifications(userId:string,page=1) {
    await this.requireOperationsOwner(userId);
    if (!Number.isInteger(page)||page<1||page>10000) throw new BadRequestException("Invalid notification page");
    const items=await this.prisma.notification.findMany({where:this.partnerNotificationWhere(userId),orderBy:[{createdAt:"desc"},{id:"desc"}],skip:(page-1)*20,take:20,select:{id:true,entityType:true,isRead:true,createdAt:true}});
    const titles:Record<string,string>={Order:"Order update",VendorSettlement:"Settlement update",VendorApplication:"Application update",Vendor:"Business account update",SupportTicket:"Support update"};
    return items.map(item=>({...item,title:titles[item.entityType||""]||"Partner update",message:"Open Partner to view the current information."}));
  }
  async readPartnerNotification(userId:string,id:string) {
    await this.requireOperationsOwner(userId);
    const item=await this.prisma.notification.findFirst({where:{...this.partnerNotificationWhere(userId),id},select:{id:true,isRead:true}});
    if (!item) throw new NotFoundException("Partner notification not found");
    await this.prisma.notification.updateMany({where:{...this.partnerNotificationWhere(userId),id,isRead:false},data:{isRead:true,readAt:new Date()}});
    return {id,isRead:true};
  }
  async partnerNotificationTarget(userId:string,id:string) {
    const vendor=await this.requireOperationsOwner(userId);
    const item=await this.prisma.notification.findFirst({where:{...this.partnerNotificationWhere(userId),id},select:{entityType:true,entityId:true}});
    if (!item || !item.entityId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.entityId)) throw new NotFoundException("Partner notification target is unavailable");
    if (item.entityType==="Order" && item.entityId && await this.prisma.order.findFirst({where:{id:item.entityId,vendorId:vendor.id},select:{id:true}})) return {route:"order",id:item.entityId};
    if (item.entityType==="VendorSettlement" && item.entityId && await this.prisma.vendorSettlement.findFirst({where:{id:item.entityId,vendorId:vendor.id},select:{id:true}})) return {route:"earnings"};
    if (item.entityType==="Vendor" && item.entityId===vendor.id) return {route:"profile"};
    if (item.entityType==="VendorApplication" && item.entityId && await this.prisma.vendorApplication.findFirst({where:{id:item.entityId,applicantUserId:userId},select:{id:true}})) return {route:"documents"};
    if (item.entityType==="SupportTicket" && item.entityId && await this.prisma.supportTicket.findFirst({where:{id:item.entityId,customer:{userId}},select:{id:true}})) return {route:"support"};
    throw new NotFoundException("This update is no longer available to this business");
  }

  async auditLogs(userId: string) {
    const vendor = await this.requireVendorForUser(userId);
    return this.prisma.vendorAuditLog.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { actor: { select: publicUserSelect } }
    });
  }

  async onboardingDocuments(userId: string) {
    const vendor = await this.requireVendorForUser(userId);
    const [documents, application] = await Promise.all([this.prisma.vendorOnboardingDocument.findMany({
      where: { vendorId: vendor.id, deletedAt: null },
      orderBy: { uploadedAt: "desc" }
    }), this.prisma.vendorApplication.findUnique({ where: { vendorId: vendor.id }, select: { reference: true } })]);
    return documents.map((document) => ({
      ...this.onboardingDocumentView(document),
      applicationType: "PARTNER",
      applicationReference: application?.reference ?? null,
      roleScope: "PARTNER"
    }));
  }

  async uploadOnboardingDocument(userId: string, dto: ApplicationDocumentDto) {
    const vendor = await this.requireVendorForUser(userId);
    const prefix = "private-upload:";
    if (!dto.documentUrl.startsWith(prefix) || !this.privateUploads) {
      throw new BadRequestException("Onboarding documents must use a server-issued private upload reference.");
    }
    const uploadId = dto.documentUrl.slice(prefix.length);
    const upload = await this.prisma.vendorPrivateUpload.findFirst({
      where: { id: uploadId, vendorId: vendor.id, deletedAt: null, onboardingDocumentId: null }
    });
    if (!upload) throw new BadRequestException("Private upload reference is invalid or already used.");
    const historicalDocument = dto.replacesDocumentId
      ? await this.prisma.vendorOnboardingDocument.findFirst({
          where: {
            id: dto.replacesDocumentId,
            vendorId: vendor.id,
            evidenceAvailability: VendorEvidenceAvailabilityState.SOURCE_UNAVAILABLE_REACQUISITION_REQUIRED,
            replacementDocument: null
          }
        })
      : null;
    if (dto.replacesDocumentId && !historicalDocument) {
      throw new BadRequestException("The historical evidence record is not eligible for replacement.");
    }
    this.privateUploads.assertOwnedKey(vendor.id, upload.storageKey);
    const document = await this.prisma.vendorOnboardingDocument.create({
      data: {
        vendorId: vendor.id,
        documentType: dto.documentType,
        documentName: dto.documentName,
        documentUrl: "CONTROLLED_PRIVATE_DOCUMENT",
        storageKey: upload.storageKey,
        replacesDocumentId: historicalDocument?.id
      }
    });
    await this.prisma.vendorPrivateUpload.update({
      where: { id: upload.id },
      data: { onboardingDocumentId: document.id }
    });
    await this.logVendorAudit(vendor.id, userId, "vendor.onboarding_document.uploaded", "VendorOnboardingDocument", document.id, {
      documentType: document.documentType,
      hasDocumentName: Boolean(document.documentName)
    });
    return this.onboardingDocumentView(document);
  }

  async privateOnboardingDocument(userId: string, documentId: string) {
    const vendor = await this.requireVendorForUser(userId);
    const document = await this.prisma.vendorOnboardingDocument.findFirst({
      where: {
        id: documentId,
        vendorId: vendor.id,
        deletedAt: null,
        storageKey: { not: null },
        evidenceAvailability: VendorEvidenceAvailabilityState.AVAILABLE
      },
      include: { vendorPrivateUpload: { select: { mimeType: true } } }
    });
    if (!document?.storageKey || !this.privateUploads) throw new NotFoundException("Partner onboarding document not found");
    const buffer = await this.privateUploads.readOwnedObject(vendor.id, document.storageKey);
    return { buffer, mimeType: document.vendorPrivateUpload?.mimeType ?? this.mimeTypeFromKey(document.storageKey) };
  }

  private onboardingDocumentView<T extends {
    id: string;
    documentUrl: string;
    storageKey?: string | null;
    evidenceAvailability?: VendorEvidenceAvailabilityState;
    verificationStatus?: string;
  }>(document: T): Record<string, unknown> {
    const { storageKey, ...safeDocument } = document;
    const availability = document.evidenceAvailability ?? VendorEvidenceAvailabilityState.AVAILABLE;
    const downloadAvailable = availability === VendorEvidenceAvailabilityState.AVAILABLE;
    return {
      ...safeDocument,
      documentUrl: downloadAvailable
        ? storageKey ? `/vendors/onboarding-documents/${document.id}/file` : document.documentUrl
        : null,
      evidenceAvailability: availability,
      downloadAvailable,
      replacementRequired: availability === VendorEvidenceAvailabilityState.SOURCE_UNAVAILABLE_REACQUISITION_REQUIRED,
      historicalApproval: !downloadAvailable && document.verificationStatus === "APPROVED"
    };
  }

  async removeOnboardingDocument(userId: string, documentId: string) {
    const vendor = await this.requireVendorForUser(userId);
    const document = await this.prisma.vendorOnboardingDocument.findFirst({ where: { id: documentId, vendorId: vendor.id, deletedAt: null } });
    if (!document?.storageKey || !this.privateUploads) throw new NotFoundException("Partner onboarding document not found");
    if (document.verificationStatus === "APPROVED") throw new BadRequestException("Approved onboarding evidence must be handled through account deletion review.");
    const attemptedAt = new Date();
    await this.prisma.vendorOnboardingDocument.update({ where: { id: document.id }, data: {
      externalDeletionState: StoredObjectDeletionState.PENDING_EXTERNAL_DELETION,
      deletionAttempts: { increment: 1 }, lastDeletionAttemptAt: attemptedAt, deletionFailureCode: null
    } });
    await this.prisma.vendorPrivateUpload.updateMany({ where: { onboardingDocumentId: document.id }, data: {
      externalDeletionState: StoredObjectDeletionState.PENDING_EXTERNAL_DELETION,
      deletionAttempts: { increment: 1 }, lastDeletionAttemptAt: attemptedAt, deletionFailureCode: null
    } });
    try {
      await this.privateUploads.deleteOwnedObject(vendor.id, document.storageKey);
    } catch (error) {
      await this.prisma.vendorOnboardingDocument.update({ where: { id: document.id }, data: {
        externalDeletionState: StoredObjectDeletionState.DELETION_FAILED, deletionFailureCode: "LOCAL_STORAGE_DELETE_FAILED"
      } });
      await this.prisma.vendorPrivateUpload.updateMany({ where: { onboardingDocumentId: document.id }, data: {
        externalDeletionState: StoredObjectDeletionState.DELETION_FAILED, deletionFailureCode: "LOCAL_STORAGE_DELETE_FAILED"
      } });
      throw new ServiceUnavailableException("Partner document deletion is pending storage retry.");
    }
    const deletedAt = new Date();
    await this.prisma.vendorPrivateUpload.updateMany({
      where: { onboardingDocumentId: document.id },
      data: {
        externalDeletionState: StoredObjectDeletionState.DELETED,
        physicallyDeletedAt: deletedAt,
        deletedAt,
        deletionFailureCode: null
      }
    });
    const updated = await this.prisma.vendorOnboardingDocument.update({ where: { id: document.id }, data: {
      externalDeletionState: StoredObjectDeletionState.DELETED, physicallyDeletedAt: deletedAt, deletedAt,
      retentionReason: null, deletionFailureCode: null
    } });
    await this.logVendorAudit(vendor.id, userId, "vendor.onboarding_document.deleted", "VendorOnboardingDocument", document.id, {
      externalDeletionState: StoredObjectDeletionState.DELETED
    });
    return { ...updated, storageKey: undefined };
  }

  async uploadFile(userId: string, purpose: VendorUploadPurpose, file?: VendorUploadedFile, requestBaseUrl?: string) {
    const vendor = await this.requireVendorForUser(userId);
    const config = UPLOAD_PURPOSES[purpose];
    if (!config) {
      throw new BadRequestException("Unsupported upload purpose");
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException("Upload a valid file before submitting.");
    }
    if (!config.mimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Unsupported file type for ${purpose.replaceAll("-", " ")}.`);
    }
    validatePartnerDocument(file);
    if (file.size > config.maxBytes) {
      throw new BadRequestException(`File is too large. Maximum size is ${Math.round(config.maxBytes / 1024 / 1024)}MB.`);
    }

    if (purpose === VendorUploadPurpose.ONBOARDING_DOCUMENT) {
      if (!this.privateUploads) throw new BadRequestException("Private upload storage is unavailable.");
      const storageKey = await this.privateUploads.putOnboardingDocument(vendor.id, file);
      const storageLocation = this.privateUploads.storageLocation();
      let upload;
      try {
        upload = await this.prisma.vendorPrivateUpload.create({ data: {
          vendorId: vendor.id,
          storageKey,
          storageProvider: storageLocation.provider,
          storageBucket: storageLocation.bucket,
          originalFileName: file.originalname.slice(0, 200),
          mimeType: file.mimetype,
          sizeBytes: file.size
        } });
      } catch {
        await this.privateUploads.deleteOwnedObject(vendor.id, storageKey);
        throw new ServiceUnavailableException("Private Partner upload could not be recorded.");
      }
      await this.logVendorAudit(vendor.id, userId, "vendor.private_file.uploaded", "VendorPrivateUpload", upload.id, {
        purpose, mimeType: file.mimetype, size: file.size
      });
      return {
        url: `private-upload:${upload.id}`,
        relativeUrl: null,
        purpose,
        access: "PRIVATE_CONTROLLED",
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size
      };
    }

    const extension = this.safeFileExtension(file.originalname, file.mimetype);
    const filename = `${Date.now()}-${randomBytes(8).toString("hex")}${extension}`;
    const relativePath = ["uploads", "vendors", vendor.id, config.directory, filename];
    const absoluteDirectory = join(process.cwd(), "uploads", "vendors", vendor.id, config.directory);
    await mkdir(absoluteDirectory, { recursive: true });
    await writeFile(join(absoluteDirectory, filename), file.buffer, { flag: "wx" });

    const relativeUrl = `/${relativePath.join("/")}`;
    const publicUrl = this.publicUploadUrl(relativeUrl, requestBaseUrl);
    await this.logVendorAudit(vendor.id, userId, "vendor.file.uploaded", "Vendor", vendor.id, {
      purpose,
      mimeType: file.mimetype,
      size: file.size
    });

    return {
      url: publicUrl,
      relativeUrl,
      purpose,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size
    };
  }

  async services(userId: string) {
    const vendor = await this.requireVendorForUser(userId);
    const services = await this.prisma.vendorService.findMany({
      where: { vendorId: vendor.id, deletedAt: null, status: { not: VendorServiceStatus.ARCHIVED } },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }]
    });
    return services.map((service) => this.toVendorServiceSummary(service));
  }

  async createService(userId: string, dto: VendorServiceInputDto) {
    const vendor = await this.requireActiveServiceVendor(userId);
    const service = await this.prisma.vendorService.create({
      data: this.vendorServiceCreateData(vendor.id, dto)
    });
    await this.logVendorAudit(vendor.id, userId, "vendor.service.created", "VendorService", service.id, {
      serviceType: service.serviceType,
      name: service.name,
      status: service.status
    });
    return this.toVendorServiceSummary(service);
  }

  async updateService(userId: string, serviceId: string, dto: UpdateVendorServiceDto) {
    const vendor = await this.requireActiveServiceVendor(userId);
    const existing = await this.prisma.vendorService.findFirst({
      where: { id: serviceId, vendorId: vendor.id, deletedAt: null }
    });
    if (!existing) throw new NotFoundException("Vendor service not found");
    const service = await this.prisma.vendorService.update({
      where: { id: serviceId },
      data: this.vendorServiceUpdateData(dto)
    });
    await this.logVendorAudit(vendor.id, userId, "vendor.service.updated", "VendorService", service.id, {
      fields: Object.keys(dto)
    });
    return this.toVendorServiceSummary(service);
  }

  async service(userId: string, serviceId: string) {
    const vendor = await this.requireActiveServiceVendor(userId);
    const service = await this.prisma.vendorService.findFirst({
      where: { id: serviceId, vendorId: vendor.id, deletedAt: null }
    });
    if (!service) throw new NotFoundException("Vendor service not found");
    return this.toVendorServiceSummary(service);
  }

  async archiveService(userId: string, serviceId: string) {
    const vendor = await this.requireActiveServiceVendor(userId);
    const existing = await this.prisma.vendorService.findFirst({
      where: { id: serviceId, vendorId: vendor.id, deletedAt: null }
    });
    if (!existing) throw new NotFoundException("Vendor service not found");
    const service = await this.prisma.vendorService.update({
      where: { id: serviceId },
      data: { status: VendorServiceStatus.ARCHIVED, isAvailable: false, deletedAt: new Date() }
    });
    await this.logVendorAudit(vendor.id, userId, "vendor.service.archived", "VendorService", service.id, {
      serviceType: service.serviceType,
      name: service.name
    });
    return this.toVendorServiceSummary(service);
  }

  async listPublic(query: ListVendorsQueryDto) {
    const productCategory = query.serviceCategory ? this.productCategoryForService(query.serviceCategory) : null;
    const filters = [
      ...(query.search
        ? [{
            OR: [
              { businessName: { contains: query.search, mode: "insensitive" as const } },
              { businessCategory: { contains: query.search, mode: "insensitive" as const } },
              { city: { contains: query.search, mode: "insensitive" as const } }
            ]
          }]
        : []),
      ...(query.serviceCategory
        ? [{
            OR: [
              { businessCategory: { contains: query.serviceCategory, mode: "insensitive" as const } },
              { category: { slug: query.serviceCategory.toLowerCase() } },
              ...(productCategory ? [{ products: { some: { productCategory, isActive: true, isAvailable: true, deletedAt: null } } }] : [])
            ]
          }]
        : [])
    ];
    const vendors = await this.prisma.vendor.findMany({
      where: {
        status: "ACTIVE",
        deletedAt: null,
        ...(filters.length ? { AND: filters } : {})
      },
      include: {
        category: true,
        products: {
          where: { isActive: true, isAvailable: true, deletedAt: null },
          select: { preparationTimeMinutes: true }
        }
      },
      orderBy: { businessName: "asc" }
    });

    return vendors.map((vendor) => this.toPublicVendor(vendor));
  }

  async publicDetail(vendorId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, status: "ACTIVE", deletedAt: null },
      include: {
        category: true,
        products: {
          where: { isActive: true, isAvailable: true, deletedAt: null },
          select: { preparationTimeMinutes: true }
        }
      }
    });

    if (!vendor) {
      throw new NotFoundException("Vendor not found");
    }

    return this.toPublicVendor(vendor);
  }

  private toPublicVendor(vendor: {
    id: string;
    businessName: string;
    businessCategory: string;
    description: string | null;
    address: string;
    city: string;
    state: string;
    logoUrl: string | null;
    coverImageUrl: string | null;
    openingTime: string | null;
    closingTime: string | null;
    isOpen: boolean;
    status: string;
    rating: { toNumber(): number } | null;
    category: { id: string; name: string; slug: string } | null;
    products: { preparationTimeMinutes: number | null }[];
  }) {
    const prepTimes = vendor.products
      .map((product) => product.preparationTimeMinutes)
      .filter((time): time is number => time !== null);
    const averagePreparationTimeMinutes = prepTimes.length
      ? Math.round(prepTimes.reduce((sum, time) => sum + time, 0) / prepTimes.length)
      : null;

    return {
      id: vendor.id,
      businessName: vendor.businessName,
      businessCategory: vendor.businessCategory,
      category: vendor.category,
      description: vendor.description,
      address: vendor.address,
      city: vendor.city,
      state: vendor.state,
      logoUrl: vendor.logoUrl,
      coverImageUrl: vendor.coverImageUrl,
      openingTime: vendor.openingTime,
      closingTime: vendor.closingTime,
      isOpen: vendor.isOpen,
      status: vendor.status,
      rating: vendor.rating?.toNumber() ?? null,
      averagePreparationTimeMinutes
    };
  }

  private productCategoryForService(serviceCategory: ServiceCategory): ProductCategory | null {
    return serviceCategory === ServiceCategory.GROCERY
      ? ProductCategory.GROCERIES
      : serviceCategory === ServiceCategory.MARKET
        ? ProductCategory.MARKET_ITEMS
        : serviceCategory === ServiceCategory.FOOD
          ? ProductCategory.FOOD
          : null;
  }

  private async requireVendorForUser(userId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { userId, deletedAt: null },
      select: {
        id: true,
        userId: true,
        businessName: true,
        businessCategory: true,
        status: true,
        deletedAt: true,
        sourceApplication: {
          select: {
            businessCategory: true,
            businessType: true,
            catalogueCategory: true,
            status: true
          }
        },
        user: {
          select: {
            accountStatus: true,
            deletedAt: true
          }
        }
      }
    });
    if (!vendor) throw new NotFoundException("Vendor profile not found");
    return vendor;
  }

  private async requireActiveServiceVendor(userId: string) {
    const vendor = await this.requireVendorForUser(userId);
    const capabilities = resolvePartnerCapabilities(vendor);
    if (!capabilities.canAccessWorkspace) {
      throw new ForbiddenException(capabilities.message);
    }
    if (!capabilities.canManageServices) {
      throw new BadRequestException("Service Provider or mixed Partner capability is required to manage services.");
    }
    return vendor;
  }

  private vendorServiceCreateData(vendorId: string, dto: VendorServiceInputDto): Prisma.VendorServiceUncheckedCreateInput {
    return {
      vendorId,
      serviceType: dto.serviceType,
      name: dto.name,
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.basePrice !== undefined ? { basePrice: new Prisma.Decimal(dto.basePrice) } : {}),
      ...(dto.priceNote !== undefined ? { priceNote: dto.priceNote } : {}),
      ...(dto.durationEstimate !== undefined ? { durationEstimate: dto.durationEstimate } : {}),
      ...(dto.serviceAreas !== undefined ? { serviceAreas: dto.serviceAreas as Prisma.InputJsonValue } : {}),
      ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.isAvailable !== undefined ? { isAvailable: dto.isAvailable } : {}),
      ...(dto.readinessOnly !== undefined ? { readinessOnly: dto.readinessOnly } : {}),
      ...(dto.internalNote !== undefined ? { internalNote: dto.internalNote } : {})
    };
  }

  private vendorServiceUpdateData(dto: UpdateVendorServiceDto): Prisma.VendorServiceUncheckedUpdateInput {
    return {
      ...(dto.serviceType !== undefined ? { serviceType: dto.serviceType } : {}),
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.basePrice !== undefined ? { basePrice: new Prisma.Decimal(dto.basePrice) } : {}),
      ...(dto.priceNote !== undefined ? { priceNote: dto.priceNote } : {}),
      ...(dto.durationEstimate !== undefined ? { durationEstimate: dto.durationEstimate } : {}),
      ...(dto.serviceAreas !== undefined ? { serviceAreas: dto.serviceAreas as Prisma.InputJsonValue } : {}),
      ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.isAvailable !== undefined ? { isAvailable: dto.isAvailable } : {}),
      ...(dto.readinessOnly !== undefined ? { readinessOnly: dto.readinessOnly } : {}),
      ...(dto.internalNote !== undefined ? { internalNote: dto.internalNote } : {})
    };
  }

  private toVendorServiceSummary(service: {
    id: string;
    vendorId: string;
    serviceType: string;
    name: string;
    description: string | null;
    basePrice: Prisma.Decimal | null;
    priceNote: string | null;
    durationEstimate: string | null;
    serviceAreas: Prisma.JsonValue | null;
    imageUrl: string | null;
    status: string;
    isAvailable: boolean;
    readinessOnly: boolean;
    internalNote: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: service.id,
      vendorId: service.vendorId,
      serviceType: service.serviceType,
      name: service.name,
      description: service.description ?? "",
      basePrice: service.basePrice?.toNumber() ?? null,
      priceNote: service.priceNote,
      durationEstimate: service.durationEstimate,
      serviceAreas: Array.isArray(service.serviceAreas) ? service.serviceAreas.filter((area): area is string => typeof area === "string") : [],
      imageUrl: service.imageUrl,
      status: service.status,
      isAvailable: service.isAvailable,
      readinessOnly: service.readinessOnly,
      internalNote: service.internalNote,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString()
    };
  }

  private mimeTypeFromKey(key: string) {
    const extension = extname(key).toLowerCase();
    if (extension === ".pdf") return "application/pdf";
    if (extension === ".png") return "image/png";
    if (extension === ".webp") return "image/webp";
    return "image/jpeg";
  }

  private safeFileExtension(originalName: string, mimeType: string) {
    return mimeType === "image/png"
      ? ".png"
      : mimeType === "image/webp"
        ? ".webp"
        : mimeType === "application/pdf"
          ? ".pdf"
          : ".jpg";
  }

  private publicUploadUrl(relativeUrl: string, requestBaseUrl?: string) {
    const configuredBase = this.config?.get<string>("BACKEND_PUBLIC_URL") ?? this.config?.get<string>("APP_URL") ?? "";
    const baseUrl = (configuredBase || requestBaseUrl || "").trim().replace(/\/+$/, "");
    return baseUrl ? `${baseUrl}${relativeUrl}` : relativeUrl;
  }

  private hashSecret(value: string) {
    return createHash("sha256").update(value).digest("hex");
  }

  private async logVendorAudit(vendorId: string, actorUserId: string, action: string, entityType: string, entityId: string, details: object) {
    await this.prisma.vendorAuditLog.create({
      data: {
        vendorId,
        actorUserId,
        action,
        entityType,
        entityId,
        newValue: details as Prisma.InputJsonValue
      }
    });
  }
}
