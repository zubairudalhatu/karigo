import { UserRole } from "@prisma/client";
import { ROLES_KEY } from "../../common/decorators/roles.decorator";
import { VendorSettlementsController } from "./vendor-settlements.controller";

describe("VendorSettlementsController", () => {
  it("keeps partner settlement visibility available to approved Partner accounts linked from Vendor or Customer users", () => {
    expect(Reflect.getMetadata(ROLES_KEY, VendorSettlementsController)).toEqual([UserRole.VENDOR, UserRole.CUSTOMER]);
  });
});
