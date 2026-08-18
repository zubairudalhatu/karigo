import { InternalServerErrorException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { AdminAuditService } from "./admin-audit.service";

describe("AdminAuditService", () => {
  const adminUserId = "78a90390-b713-4edf-86ca-862912859acd";

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("writes the authenticated persisted Admin UUID to AdminAuditLog", async () => {
    const create = jest.fn().mockResolvedValue({ id: "1d37662e-f47f-420f-9fc4-f7cc38bc05a0" });
    const service = new AdminAuditService({ adminAuditLog: { create } } as unknown as PrismaService);

    await service.record(adminUserId, "admin.utilities.accelerate_readiness_checked", "UtilityProvider", null, { authentication: "READY" });

    expect(create).toHaveBeenCalledWith({
      data: {
        adminUserId,
        action: "admin.utilities.accelerate_readiness_checked",
        entityType: "UtilityProvider",
        entityId: null,
        newValue: { authentication: "READY" }
      }
    });
  });

  it("rejects a malformed actor before Prisma and exposes a safe operational error", () => {
    const create = jest.fn();
    const logger = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const service = new AdminAuditService({ adminAuditLog: { create } } as unknown as PrismaService);

    expect(() => service.record("admin-session-actor", "admin.utilities.accelerate_readiness_checked", "UtilityProvider", null))
      .toThrow(new InternalServerErrorException("Authenticated Admin identity could not be resolved for audit recording."));
    expect(create).not.toHaveBeenCalled();
    expect(logger).toHaveBeenCalledWith(expect.not.stringContaining("admin-session-actor"));
  });
});
