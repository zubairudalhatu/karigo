const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const settlementsPage = read("app", "settlements", "page.tsx");
assert(settlementsPage.includes("settlementsApi.list"), "Settlements page must call vendor settlement API.");
assert(settlementsPage.includes("Total settlements"), "Settlements page must show total summary card.");
assert(settlementsPage.includes("Pending payout"), "Settlements page must show pending payout summary.");
assert(settlementsPage.includes("Paid out"), "Settlements page must show paid-out summary.");
assert(settlementsPage.includes("No settlements yet. Completed and eligible orders will appear here."), "Settlements page must show the approved empty state.");
assert(!settlementsPage.includes("mark paid") && !settlementsPage.includes("markVendorPaid"), "Vendor settlement page must not expose admin payout actions.");

const settlementsApi = read("src", "api", "settlements.api.ts");
assert(settlementsApi.includes("vendor/settlements"), "Vendor dashboard must use the vendor-scoped settlement endpoint.");
assert(settlementsApi.includes("VendorSettlementFilter"), "Vendor settlements API must expose safe filters.");

const notificationsPage = read("app", "notifications", "page.tsx");
assert(notificationsPage.includes("notification-title"), "Notifications must render title separately.");
assert(notificationsPage.includes("notification-message"), "Notifications must render message separately.");
assert(notificationsPage.includes("notification-time"), "Notifications must render timestamp separately.");
assert(notificationsPage.includes("markRead"), "Notification read behavior must be preserved.");
assert(notificationsPage.includes("markAllRead"), "Mark-all-read behavior must be preserved.");

const css = read("app", "globals.css");
assert(css.includes(".notification-message"), "Notification message styling must exist.");
assert(css.includes("overflow-wrap: anywhere"), "Long notification references must wrap safely.");
assert(css.includes(".settlement-card"), "Settlement card styling must exist.");

const productsPage = read("app", "products", "page.tsx");
assert(productsPage.includes("productsApi.listMine"), "Products page must use vendor-scoped product listing.");
assert(productsPage.includes("productsApi.create"), "Products page must support product creation.");
assert(productsPage.includes("productsApi.update("), "Products page must support product editing.");
assert(productsPage.includes("productsApi.updateAvailability"), "Products page must support availability toggles.");
assert(productsPage.includes("productsApi.archive"), "Products page must support safe archive.");
assert(productsPage.includes("HTTPS image URL"), "Products page must expose image URL input.");
assert(productsPage.includes("Total products"), "Products page must show total product summary.");
assert(productsPage.includes("Available products"), "Products page must show available product summary.");
assert(productsPage.includes("Unavailable products"), "Products page must show unavailable product summary.");

const productsApi = read("src", "api", "products.api.ts");
assert(productsApi.includes("vendor/products"), "Vendor dashboard product API must use vendor-owned endpoints.");
assert(productsApi.includes("VendorProductInput"), "Vendor dashboard product API must use shared product input types.");
assert(productsApi.includes("VendorProductAvailabilityInput"), "Vendor dashboard product API must use shared availability types.");

assert(css.includes(".product-layout"), "Product management layout styling must exist.");
assert(css.includes(".product-preview"), "Image preview styling must exist.");

console.log("Vendor dashboard staging regression checks passed.");
