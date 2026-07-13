import { BadRequestException } from "@nestjs/common";
import { PreferredContactMethod, VendorApplicationCategory, VendorApplicationStatus } from "@prisma/client";
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
  createdAt: now,
  updatedAt: now,
  reviews: [],
  statusHistory: []
};

describe("VendorApplicationsService", () => {
  const prisma: any = {
    vendorApplication: {
      create: jest.fn(),
      findUnique: jest.fn()
    }
  };
  const service = new VendorApplicationsService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.vendorApplication.findUnique.mockResolvedValue(null);
    prisma.vendorApplication.create.mockResolvedValue(vendorApplication);
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
    expect(result).toMatchObject({ status: VendorApplicationStatus.SUBMITTED });
  });

  it("rejects public vendor applications outside Kano", async () => {
    await expect(service.create({ ...baseDto, city: "Kaduna", state: "Kaduna" })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.vendorApplication.create).not.toHaveBeenCalled();
  });
});
