import { AccountStatus, AdminRole, UserRole } from "@prisma/client";
import { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { AdminUtilitiesController } from "./admin-utilities.controller";
import { UtilitiesService } from "./utilities.service";

describe("AdminUtilitiesController", () => {
  it("passes the JWT-reloaded persisted User UUID to the readiness audit path", async () => {
    const adminUserId = "78a90390-b713-4edf-86ca-862912859acd";
    const readiness = { connectivity: { authentication: "READY" } };
    const adminConnectivityReadiness = jest.fn().mockResolvedValue(readiness);
    const controller = new AdminUtilitiesController({ adminConnectivityReadiness } as unknown as UtilitiesService);
    const user: AuthenticatedUser = {
      id: adminUserId,
      fullName: "Operations Admin",
      phoneNumber: "+2348000000000",
      email: "operations@example.test",
      role: UserRole.ADMIN,
      adminRole: AdminRole.OPERATIONS_ADMIN,
      accountStatus: AccountStatus.ACTIVE,
      phoneVerified: true
    };

    await expect(controller.readinessCheck(user)).resolves.toEqual({
      message: "Accelerate Utilities readiness checked",
      data: readiness
    });
    expect(adminConnectivityReadiness).toHaveBeenCalledWith(adminUserId);
  });
});
