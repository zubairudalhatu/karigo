import { BadRequestException, NotFoundException } from "@nestjs/common";
import { DeliveryCaptainApplicationStatus, DeliveryCaptainVehicleType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RidersService } from "./riders.service";

const now = new Date("2026-07-13T10:00:00.000Z");

const deliveryCaptainApplication = {
  id: "00000000-0000-0000-0000-00000000c001",
  applicationReference: "KGO-CAPTAIN-2026-ABC123",
  fullName: "Demo Captain",
  phoneNumber: "+2348030000000",
  email: "captain@example.test",
  city: "Kano",
  state: "Kano",
  address: "Tarauni, Kano",
  preferredZone: "Tarauni",
  vehicleType: DeliveryCaptainVehicleType.MOTORCYCLE,
  vehiclePlateNumber: "KGO-123AA",
  riderExperience: "Two years delivery experience",
  guarantorName: "Demo Guarantor",
  guarantorPhone: "+2348030000001",
  notes: null,
  status: DeliveryCaptainApplicationStatus.SUBMITTED,
  applicantVisibleNote: null,
  reviewedAt: null,
  createdAt: now,
  updatedAt: now
};

describe("RidersService delivery captain applications", () => {
  const prisma: any = {
    rider: {
      findUnique: jest.fn(),
      update: jest.fn()
    },
    deliveryCaptainApplication: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn()
    }
  };
  const service = new RidersService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.deliveryCaptainApplication.findUnique.mockResolvedValue(null);
    prisma.deliveryCaptainApplication.create.mockResolvedValue(deliveryCaptainApplication);
    prisma.deliveryCaptainApplication.findFirst.mockResolvedValue(deliveryCaptainApplication);
  });

  it("creates a Kano Delivery Captain application without activating login, dispatch or payouts", async () => {
    const result = await service.createDeliveryCaptainApplication({
      fullName: "Demo Captain",
      phoneNumber: "08030000000",
      email: "CAPTAIN@EXAMPLE.TEST",
      city: "Kano",
      state: "Kano",
      address: "Tarauni, Kano",
      preferredZone: "Tarauni",
      vehicleType: DeliveryCaptainVehicleType.MOTORCYCLE,
      vehiclePlateNumber: "KGO-123AA",
      riderExperience: "Two years delivery experience",
      guarantorName: "Demo Guarantor",
      guarantorPhone: "08030000001",
      declarationAccepted: true,
      privacyAccepted: true,
      contactConsentAccepted: true
    });

    expect(prisma.deliveryCaptainApplication.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        applicationReference: expect.stringMatching(/^KGO-CAPTAIN-\d{4}-/),
        phoneNumber: "+2348030000000",
        guarantorPhone: "+2348030000001",
        email: "captain@example.test",
        city: "Kano",
        state: "Kano"
      })
    }));
    expect(result).toMatchObject({
      deliveryOnly: true,
      pilotCity: "Kano",
      createsLogin: false,
      activatesDispatch: false,
      payoutActivation: false
    });
  });

  it("rejects Delivery Captain applications outside the Kano pilot location", async () => {
    await expect(service.createDeliveryCaptainApplication({
      fullName: "Out of scope Captain",
      phoneNumber: "08030000000",
      city: "Kaduna",
      state: "Kaduna",
      address: "Outside Kano",
      vehicleType: DeliveryCaptainVehicleType.MOTORCYCLE,
      guarantorName: "Demo Guarantor",
      guarantorPhone: "08030000001",
      declarationAccepted: true,
      privacyAccepted: true,
      contactConsentAccepted: true
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.deliveryCaptainApplication.create).not.toHaveBeenCalled();
  });

  it("requires declarations before creating a Delivery Captain application", async () => {
    await expect(service.createDeliveryCaptainApplication({
      fullName: "Demo Captain",
      phoneNumber: "08030000000",
      city: "Kano",
      state: "Kano",
      address: "Tarauni, Kano",
      vehicleType: DeliveryCaptainVehicleType.MOTORCYCLE,
      guarantorName: "Demo Guarantor",
      guarantorPhone: "08030000001",
      declarationAccepted: true,
      privacyAccepted: false,
      contactConsentAccepted: true
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.deliveryCaptainApplication.create).not.toHaveBeenCalled();
  });

  it("returns the latest Delivery Captain public status by normalized phone number", async () => {
    await expect(service.deliveryCaptainApplicationStatus({ phoneNumber: "2348030000000" })).resolves.toMatchObject({
      applicationReference: deliveryCaptainApplication.applicationReference,
      status: DeliveryCaptainApplicationStatus.SUBMITTED,
      deliveryOnly: true
    });
    expect(prisma.deliveryCaptainApplication.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { phoneNumber: "+2348030000000" }
    }));
  });

  it("returns not found when no Delivery Captain public status exists", async () => {
    prisma.deliveryCaptainApplication.findFirst.mockResolvedValueOnce(null);
    await expect(service.deliveryCaptainApplicationStatus({ phoneNumber: "08030000000" })).rejects.toBeInstanceOf(NotFoundException);
  });
});
