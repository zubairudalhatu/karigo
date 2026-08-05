import { AdminRole, UserRole } from "@prisma/client";
import { ADMIN_ROLES_KEY } from "../../common/decorators/admin-roles.decorator";
import { ROLES_KEY } from "../../common/decorators/roles.decorator";
import { AdminLaunchOperationsController } from "./launch-operations.controller";

describe("AdminLaunchOperationsController authorization", () => {
  it("requires an Admin account with an authorised operations role", () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminLaunchOperationsController)).toEqual([UserRole.ADMIN]);
    expect(Reflect.getMetadata(ADMIN_ROLES_KEY, AdminLaunchOperationsController)).toEqual([
      AdminRole.SUPER_ADMIN,
      AdminRole.OPERATIONS_ADMIN,
      AdminRole.DISPATCH_OFFICER
    ]);
  });
});
