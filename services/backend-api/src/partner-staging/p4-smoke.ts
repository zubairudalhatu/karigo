import { randomInt, randomUUID } from "crypto";
import { hash } from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { PartnerPushService } from "../modules/notifications/partner-push.service";
export async function p4Smoke(app: any, origin: string) {
  if (
    process.env.PARTNER_ISOLATED_STAGING !== "true" ||
    process.env.APP_ENV !== "staging" ||
    !/^\/karigo_partner_p25(?:_[a-z0-9]+)?$/.test(
      new URL(process.env.DATABASE_URL!).pathname,
    )
  )
    throw Error("P4_STAGING_ONLY");
  const db = app.get(PrismaService) as PrismaService;
  const checks: Record<string, string> = {};
  const fixtures: Record<string, string> = {};
  const check = (value: unknown, name: string) => {
    if (!value) throw Error("P4_CHECK_" + name);
    checks[name] = "PASS";
  };
  const request = async (
    path: string,
    method = "GET",
    body?: unknown,
    token?: string,
    expected: number | number[] = 200,
  ) => {
    const r = await fetch(origin + "/api/v1/" + path, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
    });
    if (!(Array.isArray(expected) ? expected : [expected]).includes(r.status))
      throw Error(
        "P4_HTTP_" + r.status + "_" + path.split("/").slice(0, 2).join("_"),
      );
    const value = await r.json();
    return value.data ?? value;
  };
  const passwordHash = await hash(process.env.STAGING_QA_PASSWORD!, 12);
  async function user(label: string, role: "VENDOR" | "CUSTOMER" = "VENDOR") {
    for (let attempt = 0; attempt < 20; attempt++) {
      const phoneNumber = `+2348000000${randomInt(100, 999)}`;
      if (await db.user.findUnique({ where: { phoneNumber } })) continue;
      return db.user.create({
        data: {
          fullName: "[STAGING] P4 " + label,
          phoneNumber,
          email: `p4-${label}-${randomUUID()}@partner-stage.invalid`,
          passwordHash,
          role,
          accountStatus: "ACTIVE",
          phoneVerified: true,
        },
      });
    }
    throw Error("P4_SYNTHETIC_PHONE_UNAVAILABLE");
  }
  const a = await user("owner-a"),
    b = await user("owner-b"),
    staff = await user("manager"),
    pending = await user("pending"),
    buyer = await user("buyer", "CUSTOMER");
  const vendor = async (
    u: typeof a,
    status: "ACTIVE" | "PENDING_APPROVAL" = "ACTIVE",
  ) =>
    db.vendor.create({
      data: {
        userId: u.id,
        businessName: "[STAGING] P4 business",
        businessCategory: "RESTAURANT",
        phoneNumber: u.phoneNumber!,
        address: "Synthetic branch address",
        city: "Abuja",
        state: "FCT",
        status,
        isOpen: false,
      },
    });
  const va = await vendor(a),
    vb = await vendor(b);
  await vendor(pending, "PENDING_APPROVAL");
  fixtures.ownerBusiness = va.id;
  fixtures.otherBusiness = vb.id;
  const customer = await db.customerProfile.create({
    data: { userId: buyer.id, referralCode: randomUUID() },
  });
  await db.vendorTeamMember.create({
    data: {
      vendorId: va.id,
      userId: staff.id,
      fullName: "[STAGING] P4 manager",
      role: "MANAGER",
      invitationStatus: "ACCEPTED",
      acceptedAt: new Date(),
    },
  });
  const login = async (u: typeof a) =>
    request(
      "partner-mobile/session",
      "POST",
      { phoneNumber: u.phoneNumber!, password: process.env.STAGING_QA_PASSWORD },
      undefined,
      201,
    );
  const auth = await login(a),
    other = await login(b),
    manager = await login(staff),
    unapproved = await login(pending);
  const token = auth.accessToken as string;
  check(Boolean(token), "owner_session");
  await request(
    "vendors/operations-summary",
    "GET",
    undefined,
    manager.accessToken,
    [401, 403],
  );
  checks.staff_cannot_gain_owner_access = "PASS";
  await request(
    "vendors/branches",
    "GET",
    undefined,
    unapproved.accessToken,
    [401, 403],
  );
  checks.pending_operational_access_blocked = "PASS";
  const branch = await request(
    "vendors/branches",
    "POST",
    {
      name: "[STAGING] Primary",
      address: "Synthetic address A",
      city: "Abuja",
      state: "FCT",
      isPrimary: true,
    },
    token,
    201,
  );
  const second = await request(
    "vendors/branches",
    "POST",
    {
      name: "[STAGING] Secondary",
      address: "Synthetic address B",
      city: "Abuja",
      state: "FCT",
      isPrimary: true,
    },
    token,
    201,
  );
  let branches = await request("vendors/branches", "GET", undefined, token);
  check(
    branches.length === 2 &&
      branches.filter((x: any) => x.isPrimary).length === 1,
    "multi_branch_primary",
  );
  await request(
    `vendors/branches/${branch.id}`,
    "PATCH",
    { name: "Foreign edit" },
    other.accessToken,
    404,
  );
  checks.branch_owner_isolation = "PASS";
  await request(
    `vendors/branches/${branch.id}`,
    "PATCH",
    { vendorId: vb.id },
    token,
    400,
  );
  checks.branch_mass_assignment_blocked = "PASS";
  await request(
    `vendors/branches/${second.id}`,
    "PATCH",
    { status: "INACTIVE" },
    token,
  );
  branches = await request("vendors/branches", "GET", undefined, token);
  check(
    branches.find((x: any) => x.id === second.id).isPrimary === false,
    "branch_deactivation",
  );
  await request(
    "vendors/me",
    "PATCH",
    { openingTime: "09:00", closingTime: "18:00" },
    token,
  );
  const profile = await request("vendors/me", "GET", undefined, token);
  check(
    profile.openingTime === "09:00" && !profile.isOpen,
    "hours_preserve_offline",
  );
  const invite = await request(
    "vendors/team",
    "POST",
    {
      fullName: "[STAGING] Invitee",
      email: `invite-${randomUUID()}@partner-stage.invalid`,
      role: "VIEWER",
    },
    token,
    201,
  );
  check(
    invite.invitationStatus === "PENDING" &&
      !JSON.stringify(invite).includes("invitationTokenHash"),
    "safe_invitation_record",
  );
  await request(
    `vendors/team/${invite.id}`,
    "PATCH",
    { role: "MANAGER" },
    token,
  );
  await request(
    `vendors/team/${invite.id}`,
    "PATCH",
    { role: "OWNER" },
    token,
    400,
  );
  checks.role_escalation_blocked = "PASS";
  await request(
    `vendors/team/${invite.id}/revoke`,
    "PATCH",
    {},
    other.accessToken,
    404,
  );
  checks.invitation_business_isolation = "PASS";
  await request(`vendors/team/${invite.id}/revoke`, "PATCH", {}, token);
  check(
    (await request("vendors/team", "GET", undefined, token)).find(
      (x: any) => x.id === invite.id,
    ).invitationStatus === "REVOKED",
    "invitation_revocation",
  );
  const makeOrder = async (vendorId: string) =>
    db.order.create({
      data: {
        orderNumber: "STAGING-P4-" + randomUUID(),
        vendorId,
        customerId: customer.id,
        serviceCategory: "FOOD",
        orderStatus: "CANCELLED",
        paymentMethod: "CASH_ON_DELIVERY",
        paymentStatus: "CASH_PENDING",
        subtotal: 100,
        totalAmount: 100,
      },
    });
  const order = await makeOrder(va.id),
    foreign = await makeOrder(vb.id);
  await request(
    "partner-mobile/push/preferences",
    "PATCH",
    { enabled: false, orders: false, settlements: false },
    token,
  );
  const push = app.get(PartnerPushService) as PartnerPushService;
  await push.orderChanged(order.id);
  await push.orderChanged(order.id);
  const notices = await request(
    "vendors/notifications",
    "GET",
    undefined,
    token,
  );
  check(
    notices.length === 1 &&
      notices[0].message === "Open Partner to view the current information.",
    "inbox_without_push_opt_in",
  );
  check(
    (await db.notification.count({
      where: { userId: a.id, entityId: order.id },
    })) === 1,
    "notification_event_deduplication",
  );
  check(
    (
      await request(
        `vendors/notifications/${notices[0].id}/target`,
        "GET",
        undefined,
        token,
      )
    ).id === order.id,
    "notification_owner_target",
  );
  const detail = await request(
    `vendor-dashboard/orders/${order.id}`,
    "GET",
    undefined,
    token,
  );
  check(detail.orderStatus === "CANCELLED", "stale_order_authoritative_state");
  await request(
    `vendors/notifications/${notices[0].id}/read`,
    "PATCH",
    {},
    other.accessToken,
    404,
  );
  checks.notification_user_isolation = "PASS";
  await request(
    `vendors/notifications/${notices[0].id}/read`,
    "PATCH",
    {},
    token,
  );
  check(
    (await request("vendors/notifications", "GET", undefined, token))[0].isRead,
    "notification_read_state",
  );
  const forged = await db.notification.create({
    data: {
      userId: a.id,
      type: "SYSTEM_ALERT",
      title: "Synthetic",
      message: "Synthetic",
      entityType: "Order",
      entityId: foreign.id,
    },
  });
  await request(
    `vendors/notifications/${forged.id}/target`,
    "GET",
    undefined,
    token,
    404,
  );
  checks.notification_business_isolation = "PASS";
  const summary = await request(
    "vendors/operations-summary",
    "GET",
    undefined,
    token,
  );
  check(
    summary.branchCount === 2 &&
      summary.workspaceRole === "OWNER" &&
      summary.staffAccessSupported === false,
    "operations_summary",
  );
  await request(
    "partner-mobile/session/logout",
    "POST",
    { refreshToken: auth.refreshToken },
    token,
    201,
  );
  await request("vendors/branches", "GET", undefined, token, 401);
  checks.signed_out_access_blocked = "PASS";
  const restored = await login(a);
  await db.user.update({
    where: { id: a.id },
    data: { accountStatus: "SUSPENDED" },
  });
  await request(
    "vendors/branches",
    "GET",
    undefined,
    restored.accessToken,
    401,
  );
  checks.deactivated_access_blocked = "PASS";
  return {
    source: process.env.RENDER_GIT_COMMIT || "local",
    checks,
    fixtures,
    teamAcceptanceSupported: false,
    financialMutation: false,
  };
}
