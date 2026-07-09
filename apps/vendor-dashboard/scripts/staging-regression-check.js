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

const payoutPage = read("app", "payout-account", "page.tsx");
assert(payoutPage.includes("Set up your payout account"), "Payout account page must include setup copy.");
assert(payoutPage.includes("Update payout account"), "Payout account page must support vendor updates.");
assert(payoutPage.includes("KariGO is reviewing your payout account details."), "Payout account page must show pending verification state.");
assert(payoutPage.includes("maskedAccountNumber"), "Payout account page must display masked account details.");
assert(!payoutPage.includes("Transfer funds") && !payoutPage.includes("Pay now"), "Vendor payout page must not expose transfer controls.");

const payoutApi = read("src", "api", "payout-account.api.ts");
assert(payoutApi.includes("vendor/payout-account"), "Vendor payout account API must use vendor-scoped endpoints.");
assert(!payoutApi.includes("admin/vendor-payout-accounts"), "Vendor dashboard must not call admin payout-account endpoints.");

const shell = read("src", "components", "dashboard.tsx");
assert(shell.includes("Payout account"), "Vendor sidebar must include the payout account page.");

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
assert(productsPage.includes("Vendor catalogue"), "Products page must show the polished vendor catalogue eyebrow.");
assert(productsPage.includes("Manage your menu, availability and product options."), "Products page must show the approved supporting copy.");
assert(productsPage.includes("Options & add-ons"), "Products page must expose an options and add-ons section.");
assert(productsPage.includes("Add option group"), "Products page must let vendors add option groups.");
assert(productsPage.includes("priceAdjustmentKobo"), "Product options must use integer kobo price adjustments.");
assert(productsPage.includes("HTTPS image URL"), "Products page must expose image URL input.");
assert(productsPage.includes("Total products"), "Products page must show total product summary.");
assert(productsPage.includes("Available products"), "Products page must show available product summary.");
assert(productsPage.includes("Unavailable products"), "Products page must show unavailable product summary.");

const productsApi = read("src", "api", "products.api.ts");
assert(productsApi.includes("vendor/products"), "Vendor dashboard product API must use vendor-owned endpoints.");
assert(productsApi.includes("VendorProductInput"), "Vendor dashboard product API must use shared product input types.");
assert(productsApi.includes("VendorProductAvailabilityInput"), "Vendor dashboard product API must use shared availability types.");
assert(productsApi.includes("query.set(\"category\""), "Vendor dashboard product filters must use the public category query alias.");

assert(css.includes(".product-layout"), "Product management layout styling must exist.");
assert(css.includes(".product-preview"), "Image preview styling must exist.");
assert(css.includes(".options-panel"), "Options and add-ons panel styling must exist.");
assert(css.includes(".option-group"), "Option group styling must exist.");
assert(css.includes(".option-grid"), "Option row grid styling must exist.");

console.log("Vendor dashboard staging regression checks passed.");
