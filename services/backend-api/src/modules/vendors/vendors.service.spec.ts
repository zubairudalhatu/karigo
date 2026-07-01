import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { VendorsService } from "./vendors.service";

describe("VendorsService public listing", () => {
  const prisma = {
    vendor: { findMany: jest.fn(), findFirst: jest.fn() }
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
});
