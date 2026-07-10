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
