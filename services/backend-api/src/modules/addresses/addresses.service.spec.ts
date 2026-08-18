import { NotFoundException } from "@nestjs/common";
import { AddressesService } from "./addresses.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("AddressesService", () => {
  const tx = {
    address: {
      count: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn()
    }
  };
  const prisma = {
    address: { findFirst: jest.fn() },
    $transaction: jest.fn((callback) => callback(tx))
  };
  const service = new AddressesService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it("makes the first customer address the default", async () => {
    tx.address.count.mockResolvedValue(0);
    tx.address.create.mockImplementation(({ data }) => data);

    const address = await service.create("user-1", {
      label: "Home",
      addressLine: "Nassarawa GRA",
      city: "Kano",
      state: "Kano"
    });

    expect(address.isDefault).toBe(true);
    expect(tx.address.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "user-1", isDefault: true })
    });
  });

  it.each([
    ["Federal Capital Territory", "FCT"],
    ["Federal Capital Territory (FCT)", "FCT"],
    ["Kano State", "KANO"],
    ["Lagos State", "LAGOS"]
  ])("stores %s as canonical %s on create", async (state, expected) => {
    tx.address.count.mockResolvedValue(0);
    tx.address.create.mockImplementation(({ data }) => data);

    const address = await service.create("user-1", {
      label: "Home",
      addressLine: "Customer address",
      city: expected === "FCT" ? "Abuja" : "Kano",
      state
    });

    expect(address.state).toBe(expected);
  });

  it("updates only the owned address and canonicalizes its state", async () => {
    prisma.address.findFirst.mockResolvedValue({ id: "address-1", userId: "user-1" });
    tx.address.update.mockImplementation(({ data }) => data);

    const address = await service.update("user-1", "address-1", {
      label: "Work",
      addressLine: "Central Area",
      city: "Abuja",
      state: "Federal Capital Territory"
    });

    expect(address).toMatchObject({ label: "Work", city: "Abuja", state: "FCT" });
    expect(tx.address.update).toHaveBeenCalledWith({
      where: { id: "address-1" },
      data: expect.not.objectContaining({ id: expect.anything(), userId: expect.anything() })
    });
  });

  it("does not allow a customer to set another customer's address as default", async () => {
    prisma.address.findFirst.mockResolvedValue(null);

    await expect(service.setDefault("user-1", "address-2")).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.address.findFirst).toHaveBeenCalledWith({
      where: { id: "address-2", userId: "user-1" }
    });
  });
});

