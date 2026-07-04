import { UserRole } from "@prisma/client";
import { ROLES_KEY } from "../../common/decorators/roles.decorator";
import { VendorSettlementsController } from "./vendor-settlements.controller";

describe("VendorSettlementsController", () => {
  it("keeps vendor settlement visibility vendor-only so admins, riders and customers cannot use this route", () => {
    expect(Reflect.getMetadata(ROLES_KEY, VendorSettlementsController)).toEqual([UserRole.VENDOR]);
  });
});
