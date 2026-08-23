const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const page = fs.readFileSync(path.join(root, "app", "taxi", "page.tsx"), "utf8");
const api = fs.readFileSync(path.join(root, "src", "api", "taxi.api.ts"), "utf8");
const controller = fs.readFileSync(path.resolve(root, "..", "..", "services", "backend-api", "src", "modules", "taxi", "admin-taxi.controller.ts"), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

for (const label of ["Gross Ride fares", "KariGO commission earned", "Captain earnings", "Cash collected by Captains", "Commission outstanding", "Disputed balance"]) {
  assert(page.includes(label), `Admin daily reconciliation must show ${label}.`);
}
for (const action of ["Manual finance override", "Approve Cash refund", "Allocate responsibility", "Create adjustment", "Open financial review"]) {
  assert(page.includes(action), `Admin Finance must offer controlled ${action}.`);
}
assert(page.includes("window.confirm") && page.includes("immutable"), "Financial mutations must be confirmation-gated and describe ledger immutability.");
assert(page.includes("no Captain payout") && page.includes("gateway refund or automatic transfer"), "Admin UI must preserve Cash-only accounting and disabled automation.");
assert(api.includes("financeExport") && page.includes("Export safe CSV"), "Safe Ride reconciliation CSV export must be wired.");
for (const route of ["finance/remittances", "refunds/:refundId/responsibility", "trips/:tripId/adjustments", "trips/:tripId/dispute"]) assert(controller.includes(route), `Protected backend route ${route} must exist.`);
assert(controller.includes("@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.FINANCE_OFFICER)"), "Finance mutations must remain restricted to Finance Officer and Super Admin.");

console.log("Admin H11 Ride Finance regression checks passed.");
