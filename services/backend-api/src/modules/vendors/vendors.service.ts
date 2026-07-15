import { BadRequestException, Injectable, NotFoundException, Optional } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma, ProductCategory, ServiceCategory, VendorServiceStatus } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { extname, join } from "path";
import { ApplicationDocumentDto } from "../../common/dto/application-document.dto";
import { PrismaService } from "../../prisma/prisma.service";
import { publicUserSelect } from "../users/users.service";
import { ListVendorsQueryDto } from "./dto/list-vendors-query.dto";
import { UpdateVendorProfileDto } from "./dto/update-vendor-profile.dto";
import { InviteVendorTeamMemberDto, UpdateVendorTeamMemberDto } from "./dto/vendor-team.dto";
import { UpsertVendorBranchDto } from "./dto/vendor-branch.dto";
import { UpdateVendorServiceDto, VendorServiceInputDto } from "./dto/vendor-service.dto";
import { VendorUploadPurpose } from "./dto/vendor-upload.dto";

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
  constructor(private readonly prisma: PrismaService, @Optional() private readonly config?: ConfigService) {}

  async me(userId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { userId, deletedAt: null },
      include: {
        user: { select: publicUserSelect },
        category: true,
        branches: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
        teamMembers: { orderBy: { createdAt: "desc" }, take: 20 },
        onboardingDocuments: { orderBy: { uploadedAt: "desc" } }
      }
    });

    if (!vendor) {
      throw new NotFoundException("Vendor profile not found");
    }

    return vendor;
  }

  async update(userId: string, dto: UpdateVendorProfileDto) {
    const vendor = await this.requireVendorForUser(userId);
    const updated = await this.prisma.vendor.update({
      where: { id: vendor.id },
      data: dto,
      include: {
        user: { select: publicUserSelect },
        category: true,
        branches: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
        teamMembers: { orderBy: { createdAt: "desc" }, take: 20 }
      }
    });
    await this.logVendorAudit(vendor.id, userId, "vendor.profile.updated", "Vendor", vendor.id, {
      fields: Object.keys(dto)
    });
    return updated;
  }

  async team(userId: string) {
    const vendor = await this.requireVendorForUser(userId);
    return this.prisma.vendorTeamMember.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: "desc" }
    });
  }

  async inviteTeamMember(userId: string, dto: InviteVendorTeamMemberDto) {
    if (!dto.email && !dto.phoneNumber) {
      throw new BadRequestException("Provide either an email address or phone number for the team invitation.");
    }
    const vendor = await this.requireVendorForUser(userId);
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
    return { ...member, invitationIssued: true, invitationTokenReturned: false };
  }

  async updateTeamMember(userId: string, memberId: string, dto: UpdateVendorTeamMemberDto) {
    const vendor = await this.requireVendorForUser(userId);
    const member = await this.prisma.vendorTeamMember.findFirst({ where: { id: memberId, vendorId: vendor.id } });
    if (!member) throw new NotFoundException("Vendor team member not found");
    const updated = await this.prisma.vendorTeamMember.update({
      where: { id: member.id },
      data: dto
    });
    await this.logVendorAudit(vendor.id, userId, "vendor.team.updated", "VendorTeamMember", member.id, { role: updated.role });
    return updated;
  }

  async revokeTeamMember(userId: string, memberId: string) {
    const vendor = await this.requireVendorForUser(userId);
    const member = await this.prisma.vendorTeamMember.findFirst({ where: { id: memberId, vendorId: vendor.id } });
    if (!member) throw new NotFoundException("Vendor team member not found");
    const updated = await this.prisma.vendorTeamMember.update({
      where: { id: member.id },
      data: { invitationStatus: "REVOKED", revokedAt: new Date(), invitationTokenHash: null }
    });
    await this.logVendorAudit(vendor.id, userId, "vendor.team.revoked", "VendorTeamMember", member.id, { role: updated.role });
    return updated;
  }

  async branches(userId: string) {
    const vendor = await this.requireVendorForUser(userId);
    return this.prisma.vendorBranch.findMany({
      where: { vendorId: vendor.id },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }]
    });
  }

  async createBranch(userId: string, dto: UpsertVendorBranchDto) {
    const vendor = await this.requireVendorForUser(userId);
    const branch = await this.prisma.$transaction(async (tx) => {
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
    const vendor = await this.requireVendorForUser(userId);
    const existing = await this.prisma.vendorBranch.findFirst({ where: { id: branchId, vendorId: vendor.id } });
    if (!existing) throw new NotFoundException("Vendor branch not found");
    const branch = await this.prisma.$transaction(async (tx) => {
      if (dto.isPrimary) {
        await tx.vendorBranch.updateMany({ where: { vendorId: vendor.id, isPrimary: true, id: { not: branchId } }, data: { isPrimary: false } });
      }
      return tx.vendorBranch.update({ where: { id: branchId }, data: dto });
    });
    await this.logVendorAudit(vendor.id, userId, "vendor.branch.updated", "VendorBranch", branch.id, {
      fields: Object.keys(dto)
    });
    return branch;
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
    return this.prisma.vendorOnboardingDocument.findMany({
      where: { vendorId: vendor.id },
      orderBy: { uploadedAt: "desc" }
    });
  }

  async uploadOnboardingDocument(userId: string, dto: ApplicationDocumentDto) {
    const vendor = await this.requireVendorForUser(userId);
    const document = await this.prisma.vendorOnboardingDocument.create({
      data: {
        vendorId: vendor.id,
        documentType: dto.documentType,
        documentName: dto.documentName,
        documentUrl: dto.documentUrl
      }
    });
    await this.logVendorAudit(vendor.id, userId, "vendor.onboarding_document.uploaded", "VendorOnboardingDocument", document.id, {
      documentType: document.documentType,
      hasDocumentName: Boolean(document.documentName)
    });
    return document;
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
    if (file.size > config.maxBytes) {
      throw new BadRequestException(`File is too large. Maximum size is ${Math.round(config.maxBytes / 1024 / 1024)}MB.`);
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
    const vendor = await this.requireVendorForUser(userId);
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
    const vendor = await this.requireVendorForUser(userId);
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

  async archiveService(userId: string, serviceId: string) {
    const vendor = await this.requireVendorForUser(userId);
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
      select: { id: true, userId: true, businessName: true }
    });
    if (!vendor) throw new NotFoundException("Vendor profile not found");
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

  private safeFileExtension(originalName: string, mimeType: string) {
    const fromName = extname(originalName).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp", ".pdf"].includes(fromName)) return fromName;
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
