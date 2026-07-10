const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

const payoutPage = read("app", "payout-accounts", "page.tsx");
assert(payoutPage.includes("Payout Accounts"), "Admin portal must expose payout accounts page.");
assert(payoutPage.includes("Pending review"), "Admin payout page must show pending review summary.");
assert(payoutPage.includes("Verified accounts"), "Admin payout page must show verified summary.");
assert(payoutPage.includes("Needs update"), "Admin payout page must show needs-update summary.");
assert(payoutPage.includes("Rejected accounts"), "Admin payout page must show rejected summary.");
assert(payoutPage.includes("Full account number"), "Full account number must only appear in the review detail panel.");
assert(payoutPage.includes("window.confirm"), "Admin payout status changes must require confirmation.");
assert(!payoutPage.includes("Transfer funds") && !payoutPage.includes("Pay now"), "Admin payout page must not expose transfer controls.");

const payoutApi = read("src", "api", "vendor-payout-accounts.api.ts");
assert(payoutApi.includes("admin/vendor-payout-accounts"), "Admin portal must call admin payout account endpoints.");
assert(payoutApi.includes("maskedAccountNumber"), "Admin list data must use masked account number.");
assert(payoutApi.includes("accountNumber: string"), "Admin detail type must explicitly model full account number.");

const shell = read("src", "components", "portal.tsx");
assert(shell.includes("Payout Accounts"), "Admin sidebar must include payout accounts.");
assert(shell.includes("Utilities"), "Admin sidebar must include Utilities.");
assert(shell.includes("Taxi"), "Admin sidebar must include Taxi readiness.");

const taxiPage = read("app", "taxi", "page.tsx");
assert(taxiPage.includes("Driver Applications"), "Admin taxi page must show driver applications.");
assert(taxiPage.includes("Customer Waitlist"), "Admin taxi page must show customer waitlist.");
assert(taxiPage.includes("Driver Profiles"), "Admin taxi page must show driver profiles.");
assert(taxiPage.includes("Test Taxi Trips"), "Admin taxi page must show staging test trips.");
assert(taxiPage.includes("Taxi Summary"), "Admin taxi page must show Taxi summary.");
assert(taxiPage.includes("does not perform live dispatch, maps billing or payment capture"), "Admin taxi page must state staging-only limits.");
assert(taxiPage.includes("Taxi driver readiness review saved"), "Admin taxi page must support driver readiness review.");
assert(taxiPage.includes("Create Test Driver Profile"), "Admin taxi page must create staging driver profiles from applications.");
assert(taxiPage.includes("Assign Driver"), "Admin taxi page must support manual staging driver assignment.");
assert(taxiPage.includes("Cancel Test Trip"), "Admin taxi page must support staging trip cancellation.");
assert(!taxiPage.includes("Assign ride") && !taxiPage.includes("Dispatch taxi") && !taxiPage.includes("Pay Now"), "Admin taxi page must not expose live taxi dispatch or payment actions.");
const taxiApi = read("src", "api", "taxi.api.ts");
assert(taxiApi.includes("admin/taxi/driver-applications"), "Admin taxi API must call driver application endpoints.");
assert(taxiApi.includes("admin/taxi/waitlist"), "Admin taxi API must call waitlist endpoints.");
assert(taxiApi.includes("admin/taxi/driver-profiles"), "Admin taxi API must call staging driver profile endpoints.");
assert(taxiApi.includes("admin/taxi/trips"), "Admin taxi API must call staging trip endpoints.");
assert(taxiApi.includes("admin/taxi/summary"), "Admin taxi API must call staging summary endpoint.");

const utilitiesPage = read("app", "utilities", "page.tsx");
assert(utilitiesPage.includes("Test-mode utility transaction monitoring"), "Admin utilities page must clearly state test mode.");
assert(utilitiesPage.includes("Total transactions"), "Admin utilities page must show summary cards.");
assert(utilitiesPage.includes("Reference") && utilitiesPage.includes("Provider") && utilitiesPage.includes("Status"), "Admin utilities table must show core columns.");
assert(utilitiesPage.includes("Update this mock utility transaction status?"), "Admin utility status override must require confirmation.");
assert(!utilitiesPage.includes("Fulfil") && !utilitiesPage.includes("Send token"), "Admin utilities page must not expose live fulfilment actions.");
const utilitiesApi = read("src", "api", "utilities.api.ts");
assert(utilitiesApi.includes("admin/utilities/summary"), "Admin utilities API must load summary.");
assert(utilitiesApi.includes("admin/utilities/transactions"), "Admin utilities API must load transactions.");

console.log("Admin portal staging regression checks passed.");
