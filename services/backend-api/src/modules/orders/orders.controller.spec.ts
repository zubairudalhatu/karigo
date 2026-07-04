import { UserRole } from "@prisma/client";
import { ROLES_KEY } from "../../common/decorators/roles.decorator";
import { OrdersController } from "./orders.controller";

describe("OrdersController", () => {
  it("keeps order endpoints customer-only so vendor, admin and rider users cannot retrieve delivery OTP", () => {
    expect(Reflect.getMetadata(ROLES_KEY, OrdersController)).toEqual([UserRole.CUSTOMER]);
  });
});
