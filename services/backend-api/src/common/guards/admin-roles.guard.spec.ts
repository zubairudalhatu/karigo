import { Reflector } from "@nestjs/core";
import { AdminRole } from "@prisma/client";
import { AdminRolesGuard } from "./admin-roles.guard";

describe("AdminRolesGuard", () => {
  it("allows an authorised admin sub-role", () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([AdminRole.DISPATCH_OFFICER]) };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: { adminRole: AdminRole.DISPATCH_OFFICER } }) })
    };
    expect(new AdminRolesGuard(reflector as unknown as Reflector).canActivate(context as never)).toBe(true);
  });

  it("rejects an unauthorised admin sub-role", () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([AdminRole.DISPATCH_OFFICER]) };
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user: { adminRole: AdminRole.MARKETING_MANAGER } }) })
    };
    expect(new AdminRolesGuard(reflector as unknown as Reflector).canActivate(context as never)).toBe(false);
  });
});
