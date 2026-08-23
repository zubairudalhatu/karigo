const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const earnings = fs.readFileSync(path.join(root, "app", "earnings.tsx"), "utf8");
const earningsApi = fs.readFileSync(path.join(root, "src", "api", "earnings.api.ts"), "utf8");
const taxiApi = fs.readFileSync(path.join(root, "src", "api", "taxi.api.ts"), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

for (const field of ["grossCustomerFareKobo", "karigoCommissionKobo", "captainAdjustmentKobo", "captainEarningKobo", "cashCollectedKobo", "outstandingKarigoCommissionKobo"]) {
  assert(earningsApi.includes(field), `Captain earnings API must expose authoritative ${field}.`);
}
for (const label of ["Fare collected:", "KariGO service fee:", "Financial adjustment:", "Your earnings:", "Cash fares collected", "KariGO fee outstanding"]) {
  assert(earnings.includes(label), `Captain Earnings must clearly show ${label}.`);
}
assert(earnings.includes("Cash fares stay with you") && earnings.includes("this is not a payout"), "Cash accounting direction must not look like a Captain payout.");
assert(taxiApi.includes('"rider/taxi/earnings/statement"') && earnings.includes("remittances"), "Captain statement and remittance history must be wired.");

console.log("Captain H11 financial regression checks passed.");
