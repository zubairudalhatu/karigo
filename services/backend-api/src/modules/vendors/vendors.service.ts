import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma, ProductCategory, ServiceCategory } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { ApplicationDocumentDto } from "../../common/dto/application-document.dto";
import { PrismaService } from "../../prisma/prisma.service";
import { publicUserSelect } from "../users/users.service";
import { ListVendorsQueryDto } from "./dto/list-vendors-query.dto";
import { UpdateVendorProfileDto } from "./dto/update-vendor-profile.dto";
import { InviteVendorTeamMemberDto, UpdateVendorTeamMemberDto } from "./dto/vendor-team.dto";
import { UpsertVendorBranchDto } from "./dto/vendor-branch.dto";

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

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
