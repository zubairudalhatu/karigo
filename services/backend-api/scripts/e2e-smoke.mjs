import { PrismaClient } from "@prisma/client";

const base = process.env.API_BASE_URL ?? "http://localhost:4000/api/v1";
const prisma = new PrismaClient();
const results = [];

async function call(method, path, { token, body, expected } = {}) {
  const response = await fetch(`${base}/${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (expected !== undefined ? response.status !== expected : !response.ok) {
    throw new Error(`${method} ${path}: expected ${expected ?? "2xx"}, got ${response.status}: ${JSON.stringify(payload)}`);
  }
  return payload.data;
}
const get = (p, o) => call("GET", p, o);
const post = (p, body, token, expected) => call("POST", p, { body, token, expected });
const patch = (p, body, token, expected) => call("PATCH", p, { body, token, expected });
const check = (name, value) => { if (!value) throw new Error(`Check failed: ${name}`); results.push(name); };
const login = async (phoneNumber) => (await post("auth/login", { phoneNumber, password: "ChangeMe123!" })).accessToken;
const pay = async (order, token) => {
  const initiated = await post("payments/initiate", { orderId: order.id, amount: Number(order.totalAmount), paymentMethod: "mock" }, token);
  const ref = initiated.payment.transactionReference;
  await get(`payments/verify/${ref}`, { token });
  const duplicate = await get(`payments/verify/${ref}`, { token });
  check("payment verification is idempotent", duplicate.alreadyProcessed === true);
  return { id: initiated.payment.id, transactionReference: ref };
};
const completeDelivery = async (orderId, admin, rider, riderId) => {
  await post(`admin/orders/${orderId}/assign-rider`, { riderId }, admin);
  await post(`rider/jobs/${orderId}/accept`, {}, rider);
  for (const status of ["PICKED_UP", "ON_THE_WAY", "ARRIVED_DESTINATION", "DELIVERED"]) {
    await post(`rider/jobs/${orderId}/status`, { status }, rider);
  }
  await post(`rider/jobs/${orderId}/complete`, { deliveryOtp: "000000" }, rider, 400);
  const row = await prisma.order.findUnique({ where: { id: orderId }, select: { deliveryOtp: true } });
  await post(`rider/jobs/${orderId}/complete`, { deliveryOtp: row.deliveryOtp }, rider);
};

try {
  check("health endpoint", (await get("health")).status === "ok");
  const admin = await login("+2348000000000");
  const vendor = await login("+2348000000101");
  const rider = await login("+2348000000401");
  const adminMe = await get("auth/me", { token: admin });
  const riderProfile = await get("riders/me", { token: rider });
  const suffix = Date.now().toString().slice(-8);
  const phoneNumber = `+23481${suffix}`;
  const registered = await post("auth/customer/register", { fullName: "Task 17 Customer", phoneNumber, email: `task17-${suffix}@karigo.local`, password: "ChangeMe123!" });
  const verified = await post("auth/verify-otp", { phoneNumber, otp: registered.mockOtp });
  const customer = verified.accessToken;
  check("customer registration and OTP", verified.user.role === "CUSTOMER");

  const address = await post("addresses", { label: "Task17 Home", addressLine: "12 Integration Road", city: "Kano", state: "Kano", isDefault: true }, customer);
  const vendors = await get("vendors");
  const products = await get(`vendors/${vendors[0].id}/products`);
  check("public vendor and product browsing", vendors.length > 0 && products.length > 0);
  const promo = await post("promos/validate", { promoCode: "KARIGOFIRST", vendorId: vendors[0].id, serviceCategory: "FOOD", subtotal: Number(products[0].price), deliveryFee: 1000 }, customer);
  check("KARIGOFIRST validation", Number(promo.discountAmount) > 0);

  const food = await post("orders", { vendorId: vendors[0].id, deliveryAddressId: address.id, serviceCategory: "FOOD", items: [{ productId: products[0].id, quantity: 1 }], promoCode: "KARIGOFIRST" }, customer);
  const foodPayment = await pay(food, customer);
  const webhookBody = { eventType: "payment.success", transactionReference: foodPayment.transactionReference, status: "successful" };
  await post("payments/webhook/mock", webhookBody);
  const duplicateWebhook = await post("payments/webhook/mock", webhookBody);
  check("payment webhook is idempotent", duplicateWebhook.duplicate === true);
  check("vendor sees paid order", (await get("vendor-dashboard/orders", { token: vendor })).some((x) => x.id === food.id));
  await post(`vendor-dashboard/orders/${food.id}/accept`, {}, vendor);
  await post(`vendor-dashboard/orders/${food.id}/preparing`, {}, vendor);
  await post(`vendor-dashboard/orders/${food.id}/ready`, {}, vendor);
  await completeDelivery(food.id, admin, rider, riderProfile.id);
  const completedFood = await get(`orders/${food.id}`, { token: customer });
  check("food order completed", completedFood.orderStatus === "COMPLETED");
  check("rider earning recorded", (await get("rider/earnings", { token: rider })).completedJobs.some((x) => x.orderId === food.id));
  check("vendor settlement recorded", (await get("admin/settlements/vendors", { token: admin })).some((x) => x.orderId === food.id));
  check("vendor receives order notifications", (await get("notifications", { token: vendor })).some((x) => x.entityId === food.id));
  check("rider receives delivery notifications", (await get("notifications", { token: rider })).some((x) => x.entityId === food.id));

  const parcel = await post("orders/parcel", { pickupAddressId: address.id, deliveryAddressId: address.id, recipientName: "Parcel Recipient", recipientPhone: "+2348000000999", itemDescription: "Task 17 parcel" }, customer);
  await pay(parcel, customer);
  const paidParcel = await get(`orders/${parcel.id}`, { token: customer });
  check("paid parcel becomes dispatch-ready", paidParcel.orderStatus === "READY_FOR_PICKUP");
  await completeDelivery(parcel.id, admin, rider, riderProfile.id);
  check("parcel order completed", (await get(`orders/${parcel.id}`, { token: customer })).orderStatus === "COMPLETED");

  const refundOrder = await post("orders", { vendorId: vendors[0].id, deliveryAddressId: address.id, serviceCategory: "FOOD", items: [{ productId: products[0].id, quantity: 1 }] }, customer);
  const refundPayment = await pay(refundOrder, customer);
  await post(`vendor-dashboard/orders/${refundOrder.id}/reject`, { reason: "ITEM_UNAVAILABLE" }, vendor);
  await post(`payments/${refundPayment.id}/refund-request`, {}, customer);
  await post(`admin/payments/${refundPayment.id}/approve-refund`, {}, admin);
  check("vendor rejection refund completed", (await get(`orders/${refundOrder.id}`, { token: customer })).orderStatus === "REFUNDED");

  const ticket = await post("support/tickets", { category: "ORDER_DELAY", subject: "Task 17 support test", description: "Please review this integration ticket.", orderId: food.id }, customer);
  await post(`support/tickets/${ticket.id}/messages`, { message: "Customer-visible follow-up" }, customer);
  await post(`admin/support/tickets/${ticket.id}/assign`, { adminUserId: adminMe.id }, admin);
  await post(`admin/support/tickets/${ticket.id}/messages`, { message: "Visible admin response", isInternalNote: false }, admin);
  await post(`admin/support/tickets/${ticket.id}/messages`, { message: "Private admin note", isInternalNote: true }, admin);
  await patch(`admin/support/tickets/${ticket.id}/status`, { status: "RESOLVED" }, admin);
  await patch(`admin/support/tickets/${ticket.id}/status`, { status: "CLOSED" }, admin);
  const customerTicket = await get(`support/tickets/${ticket.id}`, { token: customer });
  check("customer cannot see internal support notes", customerTicket.messages.every((x) => !x.isInternalNote));

  const notifications = await get("notifications", { token: customer });
  check("customer notifications created", notifications.length > 0);
  const otherNotificationId = (await get("notifications", { token: vendor }))[0]?.id;
  if (otherNotificationId) await patch(`notifications/${otherNotificationId}/read`, {}, customer, 404);
  await patch("notifications/read-all", {}, customer);
  check("notification unread count clears", (await get("notifications/unread-count", { token: customer })).count === 0);

  await get("admin/dashboard", { token: customer, expected: 403 });
  await get("vendor-dashboard/orders", { token: customer, expected: 403 });
  await get("rider/jobs", { token: customer, expected: 403 });
  await get(`orders/${food.id}`, { token: vendor, expected: 403 });
  const secondPhone = `+23482${suffix}`;
  const secondRegistration = await post("auth/customer/register", { fullName: "Ownership Customer", phoneNumber: secondPhone, password: "ChangeMe123!" });
  const secondCustomer = (await post("auth/verify-otp", { phoneNumber: secondPhone, otp: secondRegistration.mockOtp })).accessToken;
  await get(`orders/${food.id}`, { token: secondCustomer, expected: 404 });
  await patch(`addresses/${address.id}`, { label: "Not mine" }, secondCustomer, 404);
  await get(`support/tickets/${ticket.id}`, { token: secondCustomer, expected: 404 });
  check("cross-customer ownership enforced", true);
  check("role access controls enforced", true);
  check("admin reports update", (await get("admin/reports/operations", { token: admin })).completedOrders >= 2);
  check("promo usage recorded after payment", (await get("admin/reports/promos", { token: admin })).some((x) => x.promoCode === "KARIGOFIRST" && x.totalUsage >= 1));

  console.log(JSON.stringify({ success: true, checks: results }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ success: false, checks: results, error: error.message }, null, 2));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
