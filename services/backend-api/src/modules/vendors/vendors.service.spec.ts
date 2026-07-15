import { Prisma, ServiceProviderType, VendorServiceStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { VendorUploadPurpose } from "./dto/vendor-upload.dto";
import { VendorsService } from "./vendors.service";

describe("VendorsService public listing", () => {
  const prisma = {
    vendor: { findMany: jest.fn(), findFirst: jest.fn() },
    vendorOnboardingDocument: { create: jest.fn() },
    vendorService: { create: jest.fn(), findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    vendorAuditLog: { create: jest.fn() }
  };
  const service = new VendorsService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it("returns a safe public vendor shape without bank details", async () => {
    prisma.vendor.findMany.mockResolvedValue([{
      id: "vendor-1",
      businessName: "Kano Kitchen",
      businessCategory: "FOOD",
      description: "Meals",
      address: "Zoo Road",
      city: "Kano",
      state: "Kano",
      logoUrl: null,
      coverImageUrl: null,
      openingTime: "08:00",
      closingTime: "20:00",
      isOpen: true,
      status: "ACTIVE",
      rating: new Prisma.Decimal(4.5),
      category: { id: "category-1", name: "Food", slug: "food" },
      products: [{ preparationTimeMinutes: 20 }, { preparationTimeMinutes: 30 }],
      bankName: "Private Bank",
      accountNumber: "0000000000"
    }]);

    const vendors = await service.listPublic({});

    expect(vendors[0].averagePreparationTimeMinutes).toBe(25);
    expect(vendors[0]).not.toHaveProperty("bankName");
    expect(vendors[0]).not.toHaveProperty("accountNumber");
  });

  it("filters pharmacy vendors without falling back to food products", async () => {
    prisma.vendor.findMany.mockResolvedValue([]);

    await service.listPublic({ serviceCategory: "PHARMACY" });

    expect(prisma.vendor.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        AND: [expect.objectContaining({
          OR: [
            { businessCategory: { contains: "PHARMACY", mode: "insensitive" } },
            { category: { slug: "pharmacy" } }
          ]
        })]
      })
    }));
  });

  it("uploads onboarding document metadata for only the authenticated vendor", async () => {
    prisma.vendor.findFirst.mockResolvedValue({
      id: "vendor-1",
      userId: "vendor-user-1",
      businessName: "Kano Kitchen"
    });
    prisma.vendorOnboardingDocument.create.mockResolvedValue({
      id: "doc-1",
      vendorId: "vendor-1",
      documentType: "CAC_CERTIFICATE",
      documentName: "CAC certificate",
      documentUrl: "https://example.test/documents/vendor-1/cac.pdf",
      verificationStatus: "PENDING"
    });

    await expect(service.uploadOnboardingDocument("vendor-user-1", {
      documentType: "CAC_CERTIFICATE",
      documentName: "CAC certificate",
      documentUrl: "https://example.test/documents/vendor-1/cac.pdf"
    })).resolves.toMatchObject({ id: "doc-1", vendorId: "vendor-1" });

    expect(prisma.vendorOnboardingDocument.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        vendorId: "vendor-1",
        documentType: "CAC_CERTIFICATE"
      })
    });
    expect(prisma.vendorAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        vendorId: "vendor-1",
        action: "vendor.onboarding_document.uploaded"
      })
    }));
  });

  it("creates vendor-owned service catalogue entries", async () => {
    prisma.vendor.findFirst.mockResolvedValue({
      id: "vendor-1",
      userId: "vendor-user-1",
      businessName: "Kano Repairs"
    });
    prisma.vendorService.create.mockResolvedValue({
      id: "service-1",
      vendorId: "vendor-1",
      serviceType: ServiceProviderType.PLUMBER,
      name: "Plumbing repairs",
      description: "Leak inspection and repair",
      basePrice: new Prisma.Decimal(5000),
      priceNote: "Final price after inspection",
      durationEstimate: "1-2 hours",
      serviceAreas: ["Tarauni", "Nassarawa"],
      imageUrl: null,
      status: VendorServiceStatus.ACTIVE,
      isAvailable: true,
      readinessOnly: false,
      internalNote: null,
      createdAt: new Date("2026-07-15T10:00:00.000Z"),
      updatedAt: new Date("2026-07-15T10:00:00.000Z")
    });

    const service = await serviceUnderTest().createService("vendor-user-1", {
      serviceType: ServiceProviderType.PLUMBER,
      name: "Plumbing repairs",
      description: "Leak inspection and repair",
      basePrice: 5000,
      priceNote: "Final price after inspection",
      durationEstimate: "1-2 hours",
      serviceAreas: ["Tarauni", "Nassarawa"],
      isAvailable: true
    });

    expect(service).toMatchObject({
      id: "service-1",
      vendorId: "vendor-1",
      serviceType: ServiceProviderType.PLUMBER,
      basePrice: 5000,
      serviceAreas: ["Tarauni", "Nassarawa"]
    });
    expect(prisma.vendorService.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        vendorId: "vendor-1",
        serviceType: ServiceProviderType.PLUMBER,
        basePrice: expect.any(Prisma.Decimal)
      })
    }));
    expect(prisma.vendorAuditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        vendorId: "vendor-1",
        action: "vendor.service.created"
      })
    }));
  });

  it("rejects unsupported vendor upload file types before writing files", async () => {
    prisma.vendor.findFirst.mockResolvedValue({
      id: "vendor-1",
      userId: "vendor-user-1",
      businessName: "Kano Kitchen"
    });

    await expect(serviceUnderTest().uploadFile("vendor-user-1", VendorUploadPurpose.PRODUCT_IMAGE, {
      originalname: "notes.txt",
      mimetype: "text/plain",
      size: 12,
      buffer: Buffer.from("not an image")
    })).rejects.toThrow("Unsupported file type");
  });

  function serviceUnderTest() {
    return new VendorsService(prisma as unknown as PrismaService);
  }
});
