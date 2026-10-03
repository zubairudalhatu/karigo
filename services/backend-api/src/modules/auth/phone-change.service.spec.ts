import { BadRequestException } from "@nestjs/common";
import { PhoneChangeStatus, UserRole } from "@prisma/client";
import { hash } from "bcrypt";
import { PhoneChangeService } from "./phone-change.service";

describe("PhoneChangeService", () => {
  const tx: any = {
    user: { update: jest.fn().mockResolvedValue({ role: UserRole.CUSTOMER }) },
    vendor: { updateMany: jest.fn() }, rider: { updateMany: jest.fn() },
    phoneChangeRequest: { update: jest.fn() }, refreshToken: { updateMany: jest.fn() },
    accountSecurityEvent: { create: jest.fn() }, notification: { create: jest.fn() }
  };
  const prisma: any = {
    user: { findUnique: jest.fn() }, phoneChangeRequest: { updateMany: jest.fn(), create: jest.fn(), findFirst: jest.fn() },
    accountSecurityEvent: { create: jest.fn() }, $transaction: jest.fn((fn) => fn(tx))
  };
  const otp: any = { issue: jest.fn(), verify: jest.fn() };
  const config: any = { get: jest.fn((_key: string, fallback: unknown) => fallback) };
  const service = new PhoneChangeService(prisma, otp, config);

  beforeEach(() => jest.clearAllMocks());

  it("requires recent password confirmation and rejects a number already in use", async () => {
    const passwordHash = await hash("CorrectPassword1", 4);
    prisma.user.findUnique.mockResolvedValueOnce({ id: "u1", passwordHash, phoneNumber: "+2348011111111", deletedAt: null });
    await expect(service.start("u1", { currentPassword: "wrong-password", newPhoneNumber: "08022222222" })).rejects.toBeInstanceOf(BadRequestException);
    prisma.user.findUnique
      .mockResolvedValueOnce({ id: "u1", passwordHash, phoneNumber: "+2348011111111", deletedAt: null })
      .mockResolvedValueOnce({ id: "u2" });
    await expect(service.start("u1", { currentPassword: "CorrectPassword1", newPhoneNumber: "08022222222" })).rejects.toBeInstanceOf(BadRequestException);
  });

  it("verifies before updating and revokes existing refresh sessions transactionally", async () => {
    prisma.phoneChangeRequest.findFirst.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111", userId: "u1", newPhoneNumber: "+2348022222222", status: PhoneChangeStatus.PENDING_NEW_PHONE_VERIFICATION, expiresAt: new Date(Date.now() + 60_000) });
    prisma.user.findUnique.mockResolvedValue({ role: UserRole.CUSTOMER });
    await expect(service.confirm("u1", { requestId: "11111111-1111-4111-8111-111111111111", otp: "123456" })).resolves.toMatchObject({ phoneChanged: true, sessionsRevoked: true });
    expect(otp.verify.mock.invocationCallOrder[0]).toBeLessThan(tx.user.update.mock.invocationCallOrder[0]);
    expect(tx.refreshToken.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "u1", revokedAt: null } }));
    expect(tx.accountSecurityEvent.create).toHaveBeenCalled();
  });

  it("rejects expired and replayed requests without changing identity", async () => {
    prisma.phoneChangeRequest.findFirst.mockResolvedValue(null);
    await expect(service.confirm("u1", { requestId: "11111111-1111-4111-8111-111111111111", otp: "123456" })).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });
});
