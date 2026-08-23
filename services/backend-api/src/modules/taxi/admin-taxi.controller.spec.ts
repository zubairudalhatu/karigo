import { AdminRole } from "@prisma/client";
import { ADMIN_ROLES_KEY } from "../../common/decorators/admin-roles.decorator";
import { AdminTaxiController } from "./admin-taxi.controller";

describe("AdminTaxiController receipt email authorization", () => {
  it("restricts failed receipt retry to explicitly authorized operational/support Admin roles", () => {
    const roles = Reflect.getMetadata(ADMIN_ROLES_KEY, AdminTaxiController.prototype.retryReceiptEmail) as AdminRole[];
    expect(roles).toEqual([AdminRole.SUPER_ADMIN, AdminRole.OPERATIONS_ADMIN, AdminRole.SUPPORT_AGENT]);
    expect(roles).not.toContain(AdminRole.RIDER_MANAGER);
  });

  it.each([
    "recordRemittance",
    "approveRefund",
    "settleRefund",
    "allocateRefundResponsibility",
    "createAdjustment",
    "openDispute",
    "resolveDispute"
  ] as const)("restricts %s to Finance Officer and Super Admin", (method) => {
    const roles = Reflect.getMetadata(ADMIN_ROLES_KEY, AdminTaxiController.prototype[method]) as AdminRole[];
    expect(roles).toEqual([AdminRole.SUPER_ADMIN, AdminRole.FINANCE_OFFICER]);
    expect(roles).not.toContain(AdminRole.OPERATIONS_ADMIN);
    expect(roles).not.toContain(AdminRole.RIDER_MANAGER);
    expect(roles).not.toContain(AdminRole.SUPPORT_AGENT);
  });

  it.each(["financeSummary", "financeSettlements", "financeCaptains", "commissionPaymentHistory"] as const)("allows controlled read-only Ride finance access through %s", (method) => {
    const roles = Reflect.getMetadata(ADMIN_ROLES_KEY, AdminTaxiController.prototype[method]) as AdminRole[];
    expect(roles).toContain(AdminRole.FINANCE_OFFICER);
    expect(roles).toContain(AdminRole.OPERATIONS_ADMIN);
    expect(roles).toContain(AdminRole.SUPPORT_AGENT);
  });

  it("does not expose ledger update or delete operations", () => {
    const controller = AdminTaxiController.prototype as unknown as Record<string, unknown>;
    expect(controller.updateFinancialLedgerEntry).toBeUndefined();
    expect(controller.deleteFinancialLedgerEntry).toBeUndefined();
  });
});
