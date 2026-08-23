import { AdminRole } from "@prisma/client";
import { ADMIN_ROLES_KEY } from "../../common/decorators/admin-roles.decorator";
import { AdminTaxiController } from "./admin-taxi.controller";

describe("AdminTaxiController receipt email authorization", () => {
  it("restricts failed receipt retry to explicitly authorized operational/support Admin roles", () => {
    const roles = Reflect.getMetadata(ADMIN_ROLES_KEY, AdminTaxiController.prototype.retryReceiptEmail) as AdminRole[];
    expect(roles).toEqual([AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.SUPPORT_AGENT]);
    expect(roles).not.toContain(AdminRole.RIDER_MANAGER);
  });
});
