import { AdminRole, UserRole } from "@prisma/client";
import { ADMIN_ROLES_KEY } from "../../common/decorators/admin-roles.decorator";
import { ROLES_KEY } from "../../common/decorators/roles.decorator";
import { AdminVendorPayoutAccountsController, VendorPayoutAccountsController } from "./vendor-payout-accounts.controller";

describe("VendorPayoutAccountsController", () => {
  it("keeps partner payout account routes available to approved Partner accounts linked from Vendor or Customer users", () => {
    expect(Reflect.getMetadata(ROLES_KEY, VendorPayoutAccountsController)).toEqual([UserRole.VENDOR, UserRole.CUSTOMER]);
  });

  it("keeps admin payout account review routes admin-only and finance/vendor-management scoped", () => {
    expect(Reflect.getMetadata(ROLES_KEY, AdminVendorPayoutAccountsController)).toEqual([UserRole.ADMIN]);
    expect(Reflect.getMetadata(ADMIN_ROLES_KEY, AdminVendorPayoutAccountsController)).toEqual([
      AdminRole.SUPER_ADMIN,
      AdminRole.OPERATIONS_ADMIN,
      AdminRole.FINANCE_OFFICER,
      AdminRole.VENDOR_MANAGER
    ]);
  });
});
