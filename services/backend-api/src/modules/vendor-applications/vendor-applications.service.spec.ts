import { BadRequestException } from "@nestjs/common";
import { PreferredContactMethod, VendorApplicationCategory, VendorApplicationStatus } from "@prisma/client";
import { ApplicationNotificationsService } from "../../common/services/application-notifications.service";
import { PrismaService } from "../../prisma/prisma.service";
import { VendorApplicationsService } from "./vendor-applications.service";

const now = new Date("2026-07-13T10:00:00.000Z");

const vendorApplication = {
  id: "00000000-0000-0000-0000-00000000a115",
  reference: "KGO-APP-2026-ABC123",
  businessCategory: VendorApplicationCategory.RESTAURANT,
  businessName: "Kano Kitchen",
  tradingName: null,
  businessType: "restaurant",
  businessDescription: "Food vendor",
  businessAddress: "Tarauni, Kano",
  state: "Kano",
  city: "Kano",
  area: null,
  serviceAreas: null,
  operatingHours: null,
  businessPhoneNumber: "+2348030000000",
  businessEmail: "vendor@example.test",
  websiteOrSocialLink: null,
  contactFullName: "Demo Owner",
  contactRole: "Owner/Manager",
  contactPhoneNumber: "+2348030000000",
  contactEmail: "vendor@example.test",
  preferredContactMethod: PreferredContactMethod.PHONE,
  deliveryReadiness: "Submitted from public KariGO website",
  deliveryPreference: "KariGO review required",
  averagePreparationTime: null,
  numberOfStaff: null,
  catalogueCategory: "RESTAURANT",
  estimatedCatalogueSize: null,
  existingDelivery: null,
  brandAssets: null,
  documentPlaceholders: null,
  declarationAccepted: true,
  privacyAccepted: true,
  contactConsentAccepted: true,
  status: VendorApplicationStatus.SUBMITTED,
  submittedAt: now,
  reviewedAt: null,
  vendorId: null,
  createdAt: now,
  updatedAt: now,
  reviews: [],
  statusHistory: [],
  documents: [],
  vendor: null
};

describe("VendorApplicationsService", () => {
  const prisma: any = {
    $transaction: jest.fn(),
    vendorApplication: {
      create: jest.fn(),
      findUnique: jest.fn()
    }
  };
  const applicationNotifications = {
    vendorApplicationSubmitted: jest.fn(),
    vendorApplicationReviewed: jest.fn()
  };
  const service = new VendorApplicationsService(prisma as unknown as PrismaService, applicationNotifications as unknown as ApplicationNotificationsService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.vendorApplication.findUnique.mockResolvedValue(null);
    prisma.vendorApplication.create.mockResolvedValue(vendorApplication);
    applicationNotifications.vendorApplicationSubmitted.mockResolvedValue(undefined);
    applicationNotifications.vendorApplicationReviewed.mockResolvedValue(undefined);
  });

  const baseDto = {
    businessCategory: VendorApplicationCategory.RESTAURANT,
    businessName: "Kano Kitchen",
    businessType: "restaurant",
    businessDescription: "Food vendor",
    businessAddress: "Tarauni, Kano",
    state: "Kano",
    city: "Kano",
    businessPhoneNumber: "+2348030000000",
    businessEmail: "vendor@example.test",
    contactFullName: "Demo Owner",
    contactRole: "Owner/Manager",
    contactPhoneNumber: "+2348030000000",
    contactEmail: "vendor@example.test",
    preferredContactMethod: PreferredContactMethod.PHONE,
    declarationAccepted: true,
    privacyAccepted: true,
    contactConsentAccepted: true
  };

  it("accepts Kano-only public vendor applications", async () => {
    const result = await service.create(baseDto);

    expect(prisma.vendorApplication.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ city: "Kano", state: "Kano" })
    }));
    expect(applicationNotifications.vendorApplicationSubmitted).toHaveBeenCalledWith(expect.objectContaining({
      reference: vendorApplication.reference,
      phoneNumber: vendorApplication.contactPhoneNumber,
      email: vendorApplication.contactEmail
    }));
    expect(result).toMatchObject({ status: VendorApplicationStatus.SUBMITTED });
  });

  it("normalizes vendor application phone numbers before persistence and notification", async () => {
    prisma.vendorApplication.create.mockResolvedValueOnce({
      ...vendorApplication,
      businessPhoneNumber: "+2348030000000",
      contactPhoneNumber: "+2348051112222"
    });

    const result = await service.create({
      ...baseDto,
      businessPhoneNumber: "0803 000 0000",
      contactPhoneNumber: "0805-111-2222"
    });

    expect(prisma.vendorApplication.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        businessPhoneNumber: "+2348030000000",
        contactPhoneNumber: "+2348051112222"
      })
    }));
    expect(applicationNotifications.vendorApplicationSubmitted).toHaveBeenCalledWith(expect.objectContaining({
      phoneNumber: "+2348051112222"
    }));
    expect(result).toMatchObject({ status: VendorApplicationStatus.SUBMITTED });
  });

  it("rejects invalid vendor application phone numbers before persistence", async () => {
    await expect(service.create({
      ...baseDto,
      contactPhoneNumber: "12345"
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.vendorApplication.create).not.toHaveBeenCalled();
    expect(applicationNotifications.vendorApplicationSubmitted).not.toHaveBeenCalled();
  });

  it("rejects public vendor applications outside Kano", async () => {
    await expect(service.create({ ...baseDto, city: "Kaduna", state: "Kaduna" })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.vendorApplication.create).not.toHaveBeenCalled();
  });

  it("notifies applicants when Admin reviews a vendor application without exposing internal notes", async () => {
    const reviewedApplication = {
      ...vendorApplication,
      status: VendorApplicationStatus.APPROVED,
      reviewedAt: now
    };
    const tx = {
      vendorApplicationReview: { create: jest.fn() },
      vendorApplicationStatusHistory: { create: jest.fn() },
      vendorApplication: { update: jest.fn().mockResolvedValue(reviewedApplication) },
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: "00000000-0000-0000-0000-00000000vusr",
          role: "VENDOR",
          accountStatus: "PENDING",
          email: vendorApplication.contactEmail,
          phoneNumber: vendorApplication.contactPhoneNumber,
          vendor: null
        })
      },
      vendor: { create: jest.fn().mockResolvedValue({ id: "00000000-0000-0000-0000-00000000v001", userId: "00000000-0000-0000-0000-00000000vusr" }) },
      vendorAccountActivation: { updateMany: jest.fn(), create: jest.fn() },
      vendorAuditLog: { create: jest.fn() },
      adminAuditLog: { create: jest.fn() }
    };
    prisma.vendorApplication.findUnique.mockResolvedValueOnce({
      ...vendorApplication,
      id: vendorApplication.id,
      status: VendorApplicationStatus.SUBMITTED
    });
    prisma.$transaction.mockImplementationOnce(async (callback: any) => callback(tx));

    await expect(service.review(vendorApplication.id, "00000000-0000-0000-0000-00000000a001", {
      status: VendorApplicationStatus.APPROVED,
      notes: "Internal setup note"
    })).resolves.toMatchObject({ status: VendorApplicationStatus.APPROVED });

    expect(applicationNotifications.vendorApplicationReviewed).toHaveBeenCalledWith({
      reference: vendorApplication.reference,
      recipientName: vendorApplication.contactFullName,
      phoneNumber: vendorApplication.contactPhoneNumber,
      email: vendorApplication.contactEmail,
      status: VendorApplicationStatus.APPROVED,
      activationUrl: expect.stringContaining("/activate?token="),
      activationExpiresAt: expect.any(String)
    });
    expect(tx.vendor.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        businessName: vendorApplication.businessName,
        status: "PENDING_APPROVAL",
        isOpen: false
      })
    }));
    expect(tx.vendorAccountActivation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        vendorId: "00000000-0000-0000-0000-00000000v001",
        userId: "00000000-0000-0000-0000-00000000vusr"
      })
    }));
  });
});
